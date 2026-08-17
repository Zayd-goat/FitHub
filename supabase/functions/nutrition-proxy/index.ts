import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json'};
let token:{value:string;expires:number}|null=null;
async function accessToken(){
 if(token&&token.expires>Date.now()+60000)return token.value;
 const id=Deno.env.get('FATSECRET_CLIENT_ID'),secret=Deno.env.get('FATSECRET_CLIENT_SECRET');
 if(!id||!secret)throw new Error('FatSecret server secrets are not configured');
 const body=new URLSearchParams({grant_type:'client_credentials',scope:Deno.env.get('FATSECRET_SCOPES')??'basic'});
 const r=await fetch('https://oauth.fatsecret.com/connect/token',{method:'POST',headers:{Authorization:'Basic '+btoa(id+':'+secret),'Content-Type':'application/x-www-form-urlencoded'},body});
 if(!r.ok)throw new Error('Nutrition provider authentication failed ('+r.status+')');
 const j=await r.json();token={value:j.access_token,expires:Date.now()+Number(j.expires_in??3600)*1000};return token.value;
}
const array=(v:any)=>!v?[]:Array.isArray(v)?v:[v];
function normalized(food:any){const ss=array(food.servings?.serving),s=ss.find((x:any)=>x.is_default==='1')??ss[0]??{};const nutrients=(x:any)=>({calories:Number(x.calories??0),protein_g:Number(x.protein??0),carbs_g:Number(x.carbohydrate??0),fat_g:Number(x.fat??0),fibre_g:Number(x.fiber??0),sugar_g:Number(x.sugar??0),saturated_fat_g:Number(x.saturated_fat??0),sodium_mg:Number(x.sodium??0),potassium_mg:Number(x.potassium??0),cholesterol_mg:Number(x.cholesterol??0)});return{provider_food_id:String(food.food_id),name:food.food_name,brand:food.brand_name??null,food_url:food.food_url??null,image_url:food.food_images?.food_image?.[0]?.image_url??food.food_images?.food_image?.image_url??null,source:'FatSecret verified database',serving_id:s.serving_id?String(s.serving_id):null,serving:s.serving_description??'1 serving',...nutrients(s),available_servings:ss.map((x:any)=>({serving_id:String(x.serving_id),label:x.serving_description,metric_amount:Number(x.metric_serving_amount??0),metric_unit:x.metric_serving_unit??null,...nutrients(x)}))};}
serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  if(!req.headers.get('authorization'))return new Response(JSON.stringify({error:'Sign in required'}),{status:401,headers:cors});
  const input=await req.json(),action=input.action??'search',access=await accessToken();let url='https://platform.fatsecret.com/rest/';
  const localized=(Deno.env.get('FATSECRET_SCOPES')??'basic').split(/\s+/).includes('localization');
  if(action==='search'){const p=new URLSearchParams({method:'foods.search.v5',search_expression:String(input.query??''),format:'json',page_number:String(input.page??0),max_results:'25'});if(localized&&input.region)p.set('region',String(input.region));if(localized&&input.language)p.set('language',String(input.language));url+='server.api?'+p;}
  else if(action==='food')url+='food/v5?food_id='+encodeURIComponent(input.food_id)+'&format=json'+(localized&&input.region?'&region='+encodeURIComponent(input.region):'');
  else if(action==='barcode')url+='server.api?method=food.find_id_for_barcode.v2&barcode='+encodeURIComponent(input.barcode)+'&format=json';
  else return new Response(JSON.stringify({error:'Unsupported action'}),{status:400,headers:cors});
  const r=await fetch(url,{headers:{Authorization:'Bearer '+access}});if(!r.ok)throw new Error('Nutrition provider returned '+r.status);const j=await r.json();
  if(action==='search'){const rows=array(j.foods?.food);return new Response(JSON.stringify({foods:rows.map((f:any)=>({provider_food_id:String(f.food_id),name:f.food_name,brand:f.brand_name??null,description:f.food_description,source:'FatSecret verified database'})),page:Number(input.page??0),total:Number(j.foods?.total_results??0),storage_notice:'Only provider food_id and serving_id may be persisted.'}),{headers:cors});}
  if(action==='barcode')return new Response(JSON.stringify({provider_food_id:j.food_id?.value??j.food_id??null}),{headers:cors});
  return new Response(JSON.stringify({food:normalized(j.food)}),{headers:cors});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:String(e)}),{status:500,headers:cors});}
});
