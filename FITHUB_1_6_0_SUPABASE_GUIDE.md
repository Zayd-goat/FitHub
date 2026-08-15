# FitHub 1.6.0 Supabase update

The database baseline is the already-run UPDATE_2026_08_14_FITHUB_1_5_0.sql. Do not rerun schema.sql
and do not rerun 1.5.0.

1. Open Supabase Dashboard, select the FitHub project, then SQL Editor and New query.
2. Paste the complete contents of supabase/UPDATE_2026_08_14_FITHUB_1_6_0_ADDITIVE.sql.
3. Select Run once. The migration uses additive columns, create-if-missing objects and guarded policies.
4. In Table Editor confirm daily_steps, nutrition_preferences, saved_meals, recipes, water_logs,
   step_groups, shared_gym_sessions, cardio_equipment_sessions and activity_streaks exist.
5. Create a FatSecret Platform developer application and accept its terms. Keep both credentials private.
6. Install/login to Supabase CLI, link the project, then run:

       supabase secrets set FATSECRET_CLIENT_ID=YOUR_ID FATSECRET_CLIENT_SECRET=YOUR_SECRET
       supabase functions deploy nutrition-proxy

7. Do not put either FatSecret credential in .env, app.json, GitHub EXPO_PUBLIC variables or Android.
8. If the FatSecret account lacks localization access, remove region/language from src/lib/nutritionApi.ts
   or request localization access. FatSecret documents localization as account-dependent.
9. In Edge Functions logs, invoke a signed-in search and confirm a 200 response. An unsigned request must fail.
10. RLS test with two accounts: each must see only its own nutrition, steps and private groups.

Rollback is by targeted drop/column reversal only after backing up user data; do not rerun the full schema.
