# FitHub 1.6.28

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_28.md](START_HERE_FITHUB_1_6_28.md), then follow [FITHUB_1_6_28_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_28_COMPLETE_UPDATE_GUIDE.md).

## 1.6.28 highlights

- Rebuilds Friends as a four-view social hub: Feed, Following, Invites and My Posts.
- Adds an isolated My Posts library with search, filters, grid/list views and post-management actions.
- Reorganises gym invitations and friend requests into clear, action-first cards.
- Adds a purpose-built social icon family matching the approved FitHub previews.
- Preserves reactions, comments, post editing, count privacy, sharing, friend alerts and gym-session reminders.
- Requires no database migration or Edge Function redeployment.

## Release identity

- App: `1.6.28`
- Android version code: `38`
- iOS build number: `38`
- APK artifact: `FitHub-1.6.28-APK`
- New SQL or Edge Function for 1.6.28: none

## Deployment boundary

If the complete FitHub 1.6.27 release is already in GitHub, apply the 1.6.28 patch and build a new APK. Use the complete package if the repository is older or uncertain.

Do not rerun an older migration or redeploy an Edge Function solely for this UI release. Never upload `.expo`, `node_modules`, `.env`, `google-services.json`, Android signing files, secrets or tokens.

## Younger-account safeguards

Younger accounts retain the neutral meal-journal safeguards: online nutrition search, barcode nutrition lookup and nutrition targets remain hidden. Load-based Clubs also remain hidden.
