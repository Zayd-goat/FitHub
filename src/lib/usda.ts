import { Food } from './types';
import { supabase } from './supabase';

export async function searchUsda(query: string): Promise<Food[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase.functions.invoke('food-search', { body: { query: query.trim() } });
  if (error) throw new Error('Online food search is not configured yet. Deploy the included Supabase food-search Edge Function.');
  return (data?.foods ?? []) as Food[];
}
