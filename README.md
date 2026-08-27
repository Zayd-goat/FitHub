# FitHub 1.6.19

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_19.md](START_HERE_FITHUB_1_6_19.md), then follow [FITHUB_1_6_19_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_19_COMPLETE_UPDATE_GUIDE.md).

## 1.6.19 highlights

- Rebuilt Home experience with a weekly activity card, refreshed quick-access icons, recent friend activity, and theme-aware surfaces.
- Community Challenges moved out of Friends. The Home card opens a dedicated Community screen with **Challenges** and **Clubs** tabs at the top.
- Run Metrics lists completed recorded runs and shows 5 km, 10 km, 15 km, 20 km, and later bests only when that exact distance exists in workout history.
- Clubs reconcile completed workout history, including an existing 100 kg Bench Press, and keep only the highest current club for each supported lift.
- Removed the duplicate Bicycle Crunch entry, corrected bodyweight fields, and replaced the male Cable Crunch artwork with an adult male exercise visual.
- FatSecret search supports 50-result pages, Load More, provider food details, selectable servings, optional localization, and account-enabled barcode search.
- Gym invites create an in-app notification immediately and request remote push delivery as soon as the invite is sent. The once-per-minute worker remains a retry path.
- Accepted gym sessions keep a separate local reminder 30 minutes before the start time, including invitations accepted from a notification action.

## Release identity

- App: `1.6.19`
- Android version code: `29`
- iOS build number: `29`
- APK artifact: `FitHub-1.6.19-APK`
- New SQL: `supabase/UPDATE_2026_08_26_FITHUB_1_6_19_ADDITIVE.sql`

## Required deployment work

After replacing the source, run the new 1.6.19 SQL once, redeploy `friend-notifications`, redeploy `nutrition-proxy`, and verify one unified once-per-minute notification cron job. Full commands and tests are in the complete guide.

The mobile app uses only the Supabase publishable/anon key. Never put a service-role key, cron secret, SMTP password, FatSecret client secret, Firebase service-account key, Android keystore, or real `.env` file in GitHub or an APK.

## Safety boundary

Under-18 accounts retain the existing protections: numerical calorie/macro tools and load-based Clubs are hidden, while Community challenges use consistency-based targets and private/friends visibility.
