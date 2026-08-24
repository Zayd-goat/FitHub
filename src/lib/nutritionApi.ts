import { supabase } from './supabase';
export async function nutritionRequest(body:Record<string,unknown>){const {data,error}=await supabase.functions.invoke('nutrition-proxy',{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data;}
export const searchFoods=(query:string,page=0)=>nutritionRequest({action:'search',query,page,region:'ZA',language:'en'});
export const foodDetails=(food_id:string)=>nutritionRequest({action:'food',food_id,region:'ZA'});
export const barcodeFood=(barcode:string)=>nutritionRequest({action:'barcode',barcode});
