# FitHub 1.6.25

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_25.md](START_HERE_FITHUB_1_6_25.md), then follow [FITHUB_1_6_25_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_25_COMPLETE_UPDATE_GUIDE.md).

## 1.6.25 highlights

- Keeps the approved 1.6.24 Home composition unchanged.
- Gives Pull, Legs, Upper, Full Body, Cardio, Shoulders, Arms, Core and Recovery their own realistic transparent gym-equipment scene.
- Rebuilds the Community destination with clearer Challenges and Clubs tabs.
- Adds Explore, Active, Invites and Completed challenge filters plus a guided three-step challenge creator.
- Improves challenge progress, invitation actions, club milestone comparisons, empty states and retry guidance.
- Preserves live workout history, challenge membership, club backfill, themes, pull-to-refresh, routes and Android Back behaviour.

## Release identity

- App: `1.6.25`
- Android version code: `35`
- iOS build number: `35`
- APK artifact: `FitHub-1.6.25-APK`
- New SQL or Edge Function for 1.6.25: none

## Deployment boundary

If the complete FitHub 1.6.24 release is already deployed, 1.6.25 can be applied with the patch ZIP and a new APK build. Do not rerun an older migration or redeploy an Edge Function solely for this UI release.

The app uses only a Supabase publishable/anon key. Never add service-role keys, SMTP passwords, FatSecret secrets, Firebase service-account keys, Android signing keys, tokens, or a real `.env` file to GitHub or the APK.

## Younger-account safeguards

Younger accounts keep the existing neutral meal-journal safeguards and do not receive load-based Clubs. Their Community view continues to focus on safe consistency-based workout and active-day challenges.

## Design basis

The redesign follows current platform guidance for adaptable layouts, touch accessibility, and five-destination bottom navigation:

- Android accessibility: https://developer.android.com/guide/topics/ui/accessibility/apps
- Android adaptive layouts: https://developer.android.com/develop/ui/views/layout/use-window-size-classes
- Material navigation bars: https://m3.material.io/components/navigation-bar
- Material cards: https://m3.material.io/components/cards/guidelines
