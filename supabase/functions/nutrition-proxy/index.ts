import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

let token: { value: string; expires: number; scopes: string } | null = null;
const configuredScopes = () => (Deno.env.get('FATSECRET_SCOPES') ?? 'basic').trim().replace(/\s+/g, ' ');
const scopeEnabled = (scope: string) => configuredScopes().split(' ').includes(scope);
const array = (value: any) => !value ? [] : Array.isArray(value) ? value : [value];

async function accessToken() {
  const scopes = configuredScopes();
  if (token && token.scopes === scopes && token.expires > Date.now() + 60_000) return token.value;
  const id = Deno.env.get('FATSECRET_CLIENT_ID');
  const secret = Deno.env.get('FATSECRET_CLIENT_SECRET');
  if (!id || !secret) throw new Error('FatSecret server secrets are not configured');
  const body = new URLSearchParams({ grant_type: 'client_credentials', scope: scopes });
  const response = await fetch('https://oauth.fatsecret.com/connect/token', { method: 'POST', headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error(`Nutrition provider authentication failed (${response.status})`);
  const json = await response.json();
  token = { value: json.access_token, expires: Date.now() + Number(json.expires_in ?? 3600) * 1000, scopes };
  return token.value;
}

function providerError(json: any) {
  const error = json?.error;
  return error ? String(error.message ?? error.error_message ?? error.code ?? 'Nutrition provider request failed') : null;
}

async function providerJson(url: string, access: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
  if (!response.ok) throw new Error(`Nutrition provider returned ${response.status}`);
  const json = await response.json();
  const message = providerError(json);
  if (message) throw new Error(message);
  return json;
}

const nutrients = (serving: any) => ({
  calories: Number(serving.calories ?? 0), protein_g: Number(serving.protein ?? 0), carbs_g: Number(serving.carbohydrate ?? 0), fat_g: Number(serving.fat ?? 0),
  fibre_g: Number(serving.fiber ?? 0), sugar_g: Number(serving.sugar ?? 0), saturated_fat_g: Number(serving.saturated_fat ?? 0), sodium_mg: Number(serving.sodium ?? 0),
  potassium_mg: Number(serving.potassium ?? 0), cholesterol_mg: Number(serving.cholesterol ?? 0),
});

function normalized(food: any) {
  const servings = array(food?.servings?.serving);
  const selected = servings.find((item: any) => item.is_default === '1' || item.is_default === true) ?? servings[0] ?? {};
  const images = array(food?.food_images?.food_image);
  return {
    provider_food_id: String(food.food_id), name: food.food_name, brand: food.brand_name ?? null, food_url: food.food_url ?? null,
    image_url: images[0]?.image_url ?? null, source: 'FatSecret verified database', serving_id: selected.serving_id ? String(selected.serving_id) : null,
    serving: selected.serving_description ?? '1 serving', ...nutrients(selected),
    available_servings: servings.map((item: any) => ({ serving_id: item.serving_id ? String(item.serving_id) : null, label: item.serving_description ?? '1 serving', metric_amount: Number(item.metric_serving_amount ?? 0), metric_unit: item.metric_serving_unit ?? null, ...nutrients(item) })),
  };
}

function localizedParams(input: any) {
  const params = new URLSearchParams();
  if (scopeEnabled('localization')) {
    if (input.region) params.set('region', String(input.region));
    if (input.language) params.set('language', String(input.language));
  }
  return params;
}

async function search(input: any, access: string) {
  const query = String(input.query ?? '').trim();
  if (query.length < 2) throw new Error('Enter at least 2 characters to search');
  const page = Math.max(0, Math.floor(Number(input.page ?? 0)));
  const maxResults = Math.max(1, Math.min(50, Math.floor(Number(input.max_results ?? 50))));
  const common = localizedParams(input);
  common.set('search_expression', query); common.set('page_number', String(page)); common.set('max_results', String(maxResults)); common.set('format', 'json');

  let json: any;
  let premium = scopeEnabled('premier');
  if (premium) {
    try { json = await providerJson(`https://platform.fatsecret.com/rest/foods/search/v5?${common}`, access); }
    catch { premium = false; }
  }
  if (!premium) {
    const legacy = new URLSearchParams(common); legacy.set('method', 'foods.search');
    json = await providerJson(`https://platform.fatsecret.com/rest/server.api?${legacy}`, access);
  }

  const container = json.foods_search?.results ?? json.foods ?? json.foods_search ?? {};
  const rows = array(container.food);
  const total = Number(json.foods_search?.total_results ?? container.total_results ?? rows.length);
  const returnedMax = Number(json.foods_search?.max_results ?? container.max_results ?? maxResults);
  const returnedPage = Number(json.foods_search?.page_number ?? container.page_number ?? page);
  return {
    foods: rows.map((food: any) => ({ provider_food_id: String(food.food_id), name: food.food_name, brand: food.brand_name ?? null, description: food.food_description ?? null, food_type: food.food_type ?? null, food_url: food.food_url ?? null, source: 'FatSecret verified database' })),
    page: returnedPage, max_results: returnedMax, total, has_more: (returnedPage + 1) * returnedMax < total,
    market: scopeEnabled('localization') && input.region ? String(input.region) : 'default', api_version: premium ? 'v5' : 'basic',
    storage_notice: 'Only provider food_id and serving_id may be persisted.',
  };
}

async function food(input: any, access: string) {
  const id = String(input.food_id ?? '').trim();
  if (!id) throw new Error('A provider food ID is required');
  const params = localizedParams(input); params.set('food_id', id); params.set('format', 'json');
  let json: any;
  if (scopeEnabled('premier')) {
    try { json = await providerJson(`https://platform.fatsecret.com/rest/food/v5?${params}`, access); } catch { json = null; }
  }
  if (!json) {
    const legacy = new URLSearchParams(params); legacy.set('method', 'food.get.v3');
    json = await providerJson(`https://platform.fatsecret.com/rest/server.api?${legacy}`, access);
  }
  return { food: normalized(json.food) };
}

async function barcode(input: any, access: string) {
  if (!scopeEnabled('barcode')) throw new Error('Barcode search is not enabled for this FatSecret application. Add the barcode scope after FatSecret enables it for your account.');
  const code = normalizeBarcode(input.barcode, input.barcode_type);
  const params = localizedParams(input); params.set('barcode', code); params.set('format', 'json');
  const json = await providerJson(`https://platform.fatsecret.com/rest/food/barcode/find-by-id/v2?${params}`, access);
  const matched = json.food ?? null;
  return { provider_food_id: matched?.food_id ? String(matched.food_id) : null, food: matched ? normalized(matched) : null };
}

function normalizeBarcode(raw: any, rawType: any) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) throw new Error('A barcode is required');
  const type = String(rawType ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let value = digits;
  if ((type === 'upce' || type === 'upc_e') && digits.length === 8) value = expandUpce(digits);
  if (![8, 12, 13].includes(value.length)) throw new Error('Use an EAN-8, UPC-A, UPC-E or EAN-13 food barcode.');
  return value.padStart(13, '0');
}

function expandUpce(value: string) {
  const numberSystem = value[0];
  const [a, b, c, d, e, mode] = value.slice(1, 7).split('');
  const check = value[7];
  let manufacturer = '';
  let product = '';
  if ('012'.includes(mode)) { manufacturer = `${a}${b}${mode}00`; product = `00${c}${d}${e}`; }
  else if (mode === '3') { manufacturer = `${a}${b}${c}00`; product = `000${d}${e}`; }
  else if (mode === '4') { manufacturer = `${a}${b}${c}${d}0`; product = `0000${e}`; }
  else { manufacturer = `${a}${b}${c}${d}${e}`; product = `0000${mode}`; }
  return `${numberSystem}${manufacturer}${product}${check}`;
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (!request.headers.get('authorization')) return new Response(JSON.stringify({ error: 'Sign in required' }), { status: 401, headers: cors });
    const input = await request.json();
    const access = await accessToken();
    const action = input.action ?? 'search';
    const result = action === 'search' ? await search(input, access) : action === 'food' ? await food(input, access) : action === 'barcode' ? await barcode(input, access) : null;
    if (!result) return new Response(JSON.stringify({ error: 'Unsupported action' }), { status: 400, headers: cors });
    return new Response(JSON.stringify(result), { headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: cors });
  }
});
