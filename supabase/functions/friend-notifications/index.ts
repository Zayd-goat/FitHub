import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async(req)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const secret=req.headers.get('x-cron-secret');
 if(!secret||secret!==Deno.env.get('FRIEND_NOTIFICATION_CRON_SECRET'))return new Response('Unauthorized',{status:401});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const{data:queue,error}=await db.from('friend_notification_outbox').select('id,recipient_id,actor_id,post_id,notification_type').is('processed_at',null).order('created_at').limit(100);
 if(error)return Response.json({error:error.message},{status:500});
 for(const item of queue??[]){
  const[{data:tokens},{data:actor}]=await Promise.all([db.from('push_tokens').select('token').eq('user_id',item.recipient_id).eq('enabled',true),db.from('public_profiles').select('username').eq('user_id',item.actor_id).maybeSingle()]);
  const messages=(tokens??[]).map((x:any)=>({to:x.token,sound:'default',title:item.notification_type==='pr'?`${actor?.username??'A friend'} set a new PR`:`${actor?.username??'A friend'} posted`,body:item.notification_type==='pr'?'Tap to view their achievement.':'Tap to view the new FitHub post.',data:{type:`friend_${item.notification_type}`,postId:item.post_id}}));
  if(messages.length)await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(messages)});
  await db.from('friend_notification_outbox').update({processed_at:new Date().toISOString()}).eq('id',item.id);
 }
 return Response.json({processed:(queue??[]).length});
});
