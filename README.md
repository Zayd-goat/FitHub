# FitHub 1.6.29

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_29.md](START_HERE_FITHUB_1_6_29.md), then follow [FITHUB_1_6_29_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_29_COMPLETE_UPDATE_GUIDE.md).

## 1.6.29 highlights

- Rebuilds You as a profile dashboard with snapshots, illustrated quick access and grouped settings.
- Guides Workout through Choose, Configure and Start while preserving active-session recovery, saved plans, drag reordering and movement guides.
- Improves Journey comparison and period progress at a glance.
- Rebuilds Supplements around today's routine, calendar, editable check-ins and reminder schedule.
- Makes Add Meal visually match Food with meal art, meal switching, search, quick-add and custom-entry sections.
- Keeps the 1.6.28 Friends, My Posts, Home and Food work intact.
- Requires no database migration or Edge Function redeployment.

## Release identity

- App: `1.6.29`
- Android version code: `39`
- iOS build number: `39`
- APK artifact: `FitHub-1.6.29-APK`
- New SQL or Edge Function for 1.6.29: none

## Deployment boundary

If the complete FitHub 1.6.28 release is already in GitHub, apply the 1.6.29 patch and build a new APK. Use the complete package if the repository is older or uncertain.

Do not rerun an older migration or redeploy an Edge Function solely for this UI release. Never upload `.expo`, `node_modules`, `.env`, `google-services.json`, Android signing files, secrets or tokens.

## Younger-account safeguards

Younger accounts retain the neutral meal-journal safeguards: online nutrition search, barcode nutrition lookup and nutrition targets remain hidden. Load-based Clubs also remain hidden.
