# FitHub 1.6.20

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_20.md](START_HERE_FITHUB_1_6_20.md), then follow [FITHUB_1_6_20_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_20_COMPLETE_UPDATE_GUIDE.md).

## 1.6.20 highlights

- Refined Home quick-access cards and replaced the global raster navigation with a consistent theme-aware vector icon system.
- Redesigned Food into a lighter diary timeline with a compact action rail, clearer meal progression, and an improved water card.
- Backdated workouts now store complete exercises, sets, reps, weights, cardio time, distance, and notes.
- Active workouts support long-press drag ordering plus **Next** and **End** placement shortcuts while preserving recorded set data.
- Exercise guides now include setup, execution, breathing, common mistakes, and a safe finish.
- In-app notifications can be swiped away. Accepting or declining a gym invite removes the original notification and immediately notifies the sender.
- Android Back now closes the post editor before leaving Friends.
- Clubs now backfill completed history without the ambiguous `club_key` database error.

## Release identity

- App: `1.6.20`
- Android version code: `30`
- iOS build number: `30`
- APK artifact: `FitHub-1.6.20-APK`
- New SQL: `supabase/UPDATE_2026_08_28_FITHUB_1_6_20_ADDITIVE.sql`

## Required deployment work

After replacing the source, run the new 1.6.20 SQL once, redeploy `friend-notifications`, and verify one unified once-per-minute notification cron job. Full commands and tests are in the complete guide.

The mobile app uses only the Supabase publishable/anon key. Never put a service-role key, cron secret, SMTP password, FatSecret client secret, Firebase service-account key, Android keystore, or real `.env` file in GitHub or an APK.

## Safety boundary

Under-18 accounts retain the existing protections: numerical calorie/macro tools and load-based Clubs are hidden, while Community challenges use consistency-based targets and private/friends visibility.
