# FitHub 1.6.27

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_27.md](START_HERE_FITHUB_1_6_27.md), then follow [FITHUB_1_6_27_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_27_COMPLETE_UPDATE_GUIDE.md).

## 1.6.27 highlights

- Rebuilds the Home `Your Week` and `Quick Access` sections with the approved realistic FitHub mini-scenes.
- Rebuilds the Food hero, shortcuts, meal cards and hydration section with matching transparent artwork.
- Adds a fresh, consistent five-icon bottom-navigation family while retaining the familiar raised Train control.
- Keeps week data, meal state, water progress, routes, touch targets, themes and accessibility labels native and interactive.
- Fixes the React Native `StyleSheet.absoluteFillObject` typecheck failure reported by the 1.6.26 Android build.
- Preserves the Community Challenges/Clubs redesign and all earlier workout, social and notification updates.

## Release identity

- App: `1.6.27`
- Android version code: `37`
- iOS build number: `37`
- APK artifact: `FitHub-1.6.27-APK`
- New SQL or Edge Function for 1.6.27: none

## Deployment boundary

If the complete FitHub 1.6.26 release is already in GitHub, apply the 1.6.27 patch and build a new APK. Use the complete package if the repository is older or uncertain.

Do not rerun an older migration or redeploy an Edge Function solely for this UI release. Never upload `.expo`, `node_modules`, `.env`, `google-services.json`, Android signing files, secrets or tokens.

## Younger-account safeguards

Younger accounts retain the neutral meal-journal safeguards: online nutrition search, barcode nutrition lookup and nutrition targets remain hidden. Load-based Clubs also remain hidden.
