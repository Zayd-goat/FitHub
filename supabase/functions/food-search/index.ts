import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function nutrient(item: any, names: string[]) {
  const n = (item.foodNutrients ?? []).find((x: any) => names.includes(String(x.nutrientName ?? x.name ?? '').toLowerCase()));
  return Number(n?.value ?? n?.amount ?? 0);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') return new Response(JSON.stringify({ foods: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const apiKey = Deno.env.get('USDA_API_KEY');
    if (!apiKey) throw new Error('USDA_API_KEY secret is missing');
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&pageSize=12`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`USDA returned ${r.status}`);
    const json = await r.json();
    const foods = (json.foods ?? []).map((item: any) => ({
      name: item.description ?? 'USDA food',
      serving: item.servingSize ? `${item.servingSize} ${item.servingSizeUnit ?? 'g'}` : '100 g',
      calories: nutrient(item, ['energy', 'energy (atwater general factors)', 'energy (atwater specific factors)']),
      protein_g: nutrient(item, ['protein']),
      carbs_g: nutrient(item, ['carbohydrate, by difference']),
      fat_g: nutrient(item, ['total lipid (fat)']),
      source: 'USDA FoodData Central'
    }));
    return new Response(JSON.stringify({ foods }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
