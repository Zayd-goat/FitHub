# FitHub 1.6.30

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_30.md](START_HERE_FITHUB_1_6_30.md), then follow [FITHUB_1_6_30_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_30_COMPLETE_UPDATE_GUIDE.md).

## 1.6.30 highlights

- Makes Workout open directly on the muscle-group artwork by removing the extra hero, progress rail and Step 1 introduction.
- Rebuilds App & account on You with illustrated Customize FitHub, Weekly split and Clubs cards.
- Groups Personal details into Profile, Training and Preferences panels with purpose-built icons and a clear Edit action.
- Preserves profile editing, avatar upload, saved workouts, active-session recovery, drag reordering and exercise guidance.
- Keeps every Home, Food, Friends, Journey, Supplements and Add Meal update from 1.6.29 intact.
- Requires no database migration or Edge Function redeployment.

## Release identity

- App: `1.6.30`
- Android version code: `40`
- iOS build number: `40`
- APK artifact: `FitHub-1.6.30-APK`
- New SQL or Edge Function for 1.6.30: none

## Deployment boundary

If the complete FitHub 1.6.29 release is already in GitHub, apply the 1.6.30 patch and build a new APK. Use the complete package if the repository is older or uncertain.

Do not rerun an older migration or redeploy an Edge Function solely for this UI release. Never upload `.expo`, `node_modules`, `.env`, `google-services.json`, Android signing files, secrets or tokens.

## Younger-account safeguards

Younger accounts retain the neutral meal-journal safeguards: online nutrition search, barcode nutrition lookup and nutrition targets remain hidden. Load-based Clubs also remain hidden.
