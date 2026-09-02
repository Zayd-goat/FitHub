# FitHub 1.6.31

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_31.md](START_HERE_FITHUB_1_6_31.md), then follow [FITHUB_1_6_31_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_31_COMPLETE_UPDATE_GUIDE.md).

## 1.6.31 highlights

- Replaces native-looking alerts with a consistent, theme-aware FitHub action sheet throughout the app.
- Lets users dismiss every upgraded popup with the close control, the dimmed background, or their phone’s Android Back button.
- Makes every Post controls action visible, including the requested Delete post action and its confirmation.
- Rebuilds all seven You-page destination illustrations as original realistic transparent artwork.
- Keeps every route, profile action, post control, theme, younger-account safeguard, and 1.6.30 feature intact.
- Requires no database migration or Edge Function redeployment.

## Release identity

- App: `1.6.31`
- Android version code: `41`
- iOS build number: `41`
- APK artifact: `FitHub-1.6.31-APK`
- New SQL or Edge Function for 1.6.31: none

## Deployment boundary

If the complete FitHub 1.6.30 release is already in GitHub, apply the 1.6.31 patch and build a new APK. Use the complete package if the repository is older or uncertain.

Do not rerun an older migration or redeploy an Edge Function solely for this UI release. Never upload `.expo`, `node_modules`, `.env`, `google-services.json`, Android signing files, secrets or tokens.

## Younger-account safeguards

Younger accounts retain the neutral meal-journal safeguards: online nutrition search, barcode nutrition lookup and nutrition targets remain hidden. Load-based Clubs also remain hidden. The Supplements destination artwork is generic, unbranded and makes no product or dosage claim.
