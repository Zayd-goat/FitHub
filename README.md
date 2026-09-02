# FitHub 1.6.32

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_32.md](START_HERE_FITHUB_1_6_32.md), then follow [FITHUB_1_6_32_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_32_COMPLETE_UPDATE_GUIDE.md).

## 1.6.32 highlights

- Makes the Gym Together page send real, notification-backed invites to confirmed friends.
- Lets a shared-session leader invite additional friends into the same workout room.
- Rebuilds Gym Together, Supplement Tracker, My Fitness Journey, Weekly Split and Customize FitHub with clearer controls and realistic FitHub artwork.
- Preserves supplement history when a reminder is removed, improves daily status editing, and keeps younger-account guidance neutral and support-led.
- Adds past-period navigation to Journey reports and image-led weekly workout planning.
- Keeps the Home, Food, Friends, You, popup, workout and notification improvements from earlier releases intact.

## Release identity

- App: `1.6.32`
- Android version code: `42`
- iOS build number: `42`
- APK artifact: `FitHub-1.6.32-APK`
- New SQL: `supabase/UPDATE_2026_09_02_FITHUB_1_6_32_ADDITIVE.sql`
- Edge Function code is unchanged; keep the existing `friend-notifications` deployment active.

## Deployment boundary

If the complete FitHub 1.6.31 release is already in GitHub, apply the 1.6.32 patch and build a new APK. Use the complete package if the repository is older or uncertain.

Run the 1.6.32 additive SQL once before testing Gym Together or removing a supplement reminder. Never upload `.expo`, `node_modules`, `.env`, `google-services.json`, Android signing files, secrets or tokens.

## Younger-account safeguards

Younger accounts retain the neutral meal-journal safeguards: online nutrition search, barcode nutrition lookup and nutrition targets remain hidden. Load-based Clubs also remain hidden. Supplement tracking does not recommend a product or dose and continues to direct younger users toward parent, guardian or qualified-clinician support.
