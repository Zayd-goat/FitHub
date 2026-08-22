import Storage from 'expo-sqlite/kv-store';
import { supabase } from './supabase';
const KEY='fithub_nutrition_queue_v1';
const requestId=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export async function queueNutritionWrite(table:string,payload:any){const q=JSON.parse(await Storage.getItem(KEY)||'[]');q.push({table,payload:{...payload,client_request_id:payload.client_request_id??requestId()},queued_at:new Date().toISOString()});await Storage.setItem(KEY,JSON.stringify(q));}
export async function flushNutritionQueue(){const q=JSON.parse(await Storage.getItem(KEY)||'[]'),left=[];for(const item of q){const {error}=await supabase.from(item.table).upsert(item.payload,{onConflict:'user_id,client_request_id'});if(error)left.push(item);}await Storage.setItem(KEY,JSON.stringify(left));return{synced:q.length-left.length,pending:left.length};}
