# Friend and Gym-Invite Notification Worker

This server-side function processes private friend-post and gym-invite outbox rows. Gym invites use the `GYMINVITE` notification category so the installed FitHub app can show Accept and Decline actions.

## Deploy

The endpoint is protected by `FRIEND_NOTIFICATION_CRON_SECRET`, so deploy it without gateway JWT verification and keep the custom secret private:

```text
supabase secrets set FRIEND_NOTIFICATION_CRON_SECRET=YOUR_LONG_RANDOM_VALUE
supabase functions deploy friend-notifications --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are server-side Supabase environment values. Never place a service-role key in the mobile app or GitHub APK secrets.

## Schedule

Create or update one Supabase Cron job that sends a POST request every minute to:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/friend-notifications
```

Use these headers:

```text
Content-Type: application/json
x-cron-secret: YOUR_LONG_RANDOM_VALUE
```

Use `{}` as the body. Do not create a second job if an existing FitHub friend-notification job already calls this function; edit the existing job instead.
