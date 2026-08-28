import { supabase } from './supabase';

export type ProviderFoodSummary = {
  provider_food_id: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  food_type?: string | null;
  food_url?: string | null;
  source: string;
};

export type ProviderSearchResponse = {
  foods: ProviderFoodSummary[];
  page: number;
  max_results: number;
  total: number;
  has_more: boolean;
  market: string;
  api_version: string;
};

export async function nutritionRequest<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('nutrition-proxy', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const searchFoods = (query: string, page = 0, maxResults = 50) => nutritionRequest<ProviderSearchResponse>({ action: 'search', query, page, max_results: maxResults, region: 'ZA', language: 'en' });
export const foodDetails = (food_id: string) => nutritionRequest<{ food: any }>({ action: 'food', food_id, region: 'ZA', language: 'en' });
export const barcodeFood = (barcode: string, barcode_type?: string) => nutritionRequest<{ provider_food_id: string | null; food?: any | null }>({ action: 'barcode', barcode, barcode_type, region: 'ZA', language: 'en' });
