# FitHub 1.6.21

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_21.md](START_HERE_FITHUB_1_6_21.md), then follow [FITHUB_1_6_21_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_21_COMPLETE_UPDATE_GUIDE.md).

## 1.6.21 highlights

- Implements the approved Home design with the exact week-card structure, gym-styled Quick Access icon family, spacing, rounded cards, and theme-aware colours.
- Implements the approved Food design with its diary illustration, four separate action cards, connected meal timeline, meal icons, water card, and shared floating navigation dock.
- Rebuilds My Fitness Journey around current-versus-previous comparisons, tap-selectable activity trends, clearer report dates, and private progress highlights.
- Keeps younger accounts focused on workout consistency, recorded exercises, setup, and technique instead of load-based records.
- Retains all 1.6.20 workout-history, drag ordering, exercise-guidance, notification, gym-invite response, post-editor Back, and Clubs fixes.

## Release identity

- App: `1.6.21`
- Android version code: `31`
- iOS build number: `31`
- APK artifact: `FitHub-1.6.21-APK`
- New SQL for 1.6.21: none

## Required deployment work

If 1.6.20 is already fully deployed, 1.6.21 requires only the source replacement and a fresh APK build. Do not rerun the 1.6.20 migration or redeploy Edge Functions solely for this UI release. Full steps and tests are in the complete guide.

The mobile app uses only the Supabase publishable/anon key. Never put a service-role key, cron secret, SMTP password, FatSecret client secret, Firebase service-account key, Android keystore, or real `.env` file in GitHub or an APK.

## Safety boundary

Under-18 accounts retain the existing protections: numerical calorie/macro tools and load-based Clubs are hidden, while Community challenges use consistency-based targets and private/friends visibility.
