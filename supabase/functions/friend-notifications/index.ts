import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const push = async (messages: Record<string, unknown>[]) => {
  if (!messages.length) return true;
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(messages),
  });
  return response.ok;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== Deno.env.get('FRIEND_NOTIFICATION_CRON_SECRET')) return new Response('Unauthorized', { status: 401 });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const [{ data: friendQueue, error: friendError }, { data: inviteQueue, error: inviteError }] = await Promise.all([
    db.from('friend_notification_outbox').select('id,recipient_id,actor_id,post_id,notification_type').is('processed_at', null).order('created_at').limit(100),
    db.from('gym_invite_notification_outbox').select('id,invite_id,recipient_id,actor_id').is('processed_at', null).order('created_at').limit(100),
  ]);
  if (friendError || inviteError) return Response.json({ error: friendError?.message ?? inviteError?.message }, { status: 500 });

  let processed = 0;
  for (const item of friendQueue ?? []) {
    const [{ data: tokens }, { data: actor }] = await Promise.all([
      db.from('push_tokens').select('token').eq('user_id', item.recipient_id).eq('enabled', true),
      db.from('public_profiles').select('username').eq('user_id', item.actor_id).maybeSingle(),
    ]);
    const messages = (tokens ?? []).map((row: any) => ({
      to: row.token,
      sound: 'default',
      title: item.notification_type === 'pr' ? `${actor?.username ?? 'A friend'} set a new PR` : `${actor?.username ?? 'A friend'} posted`,
      body: item.notification_type === 'pr' ? 'Tap to view their achievement.' : 'Tap to view the new FitHub post.',
      data: { type: `friend_${item.notification_type}`, postId: item.post_id },
    }));
    if (await push(messages)) {
      await db.from('friend_notification_outbox').update({ processed_at: new Date().toISOString() }).eq('id', item.id);
      processed += 1;
    }
  }

  for (const item of inviteQueue ?? []) {
    const [{ data: tokens }, { data: actor }, { data: invite }] = await Promise.all([
      db.from('push_tokens').select('token').eq('user_id', item.recipient_id).eq('enabled', true),
      db.from('public_profiles').select('username').eq('user_id', item.actor_id).maybeSingle(),
      db.from('gym_invites').select('workout_name,gym_name,session_at,status').eq('id', item.invite_id).maybeSingle(),
    ]);
    const sessionAt = invite?.session_at ? new Date(invite.session_at) : null;
    if (!invite || invite.status !== 'pending' || !sessionAt || !Number.isFinite(sessionAt.getTime()) || sessionAt.getTime() <= Date.now()) {
      await db.from('gym_invite_notification_outbox').update({ processed_at: new Date().toISOString() }).eq('id', item.id);
      processed += 1;
      continue;
    }
    const sessionText = sessionAt.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
    const details = [invite.workout_name, invite.gym_name, sessionText].filter(Boolean).join(' • ');
    const messages = (tokens ?? []).map((row: any) => ({
      to: row.token,
      sound: 'default',
      priority: 'high',
      expiration: Math.floor(sessionAt.getTime() / 1000),
      title: `${actor?.username ?? 'A friend'} invited you to the gym`,
      body: details || 'Open FitHub to review the invitation.',
      categoryId: 'GYMINVITE',
      channelId: 'gym-reminders',
      tag: `gym-invite-${item.invite_id}`,
      data: { type: 'gym_invite_request', inviteId: item.invite_id, userId: item.recipient_id },
    }));
    if (await push(messages)) {
      await db.from('gym_invite_notification_outbox').update({ processed_at: new Date().toISOString() }).eq('id', item.id);
      processed += 1;
    }
  }

  return Response.json({ processed, friendQueued: (friendQueue ?? []).length, inviteQueued: (inviteQueue ?? []).length });
});
