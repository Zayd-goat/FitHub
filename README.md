# FitHub 1.6.33

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

This release builds on the complete 1.6.32 update. The existing 1.6.32 deployment guide and SQL migration remain valid.

## 1.6.33 highlights

- Fully rebuilds Fitness Journey in the same image-led visual language as Home and Food.
- Replaces the repetitive six-card layout with a consolidated performance overview.
- Adds an interactive activity trend chart for workouts, minutes, sets and cardio distance.
- Adds clearer current-versus-previous comparison bars and simplified report navigation.
- Keeps weekly/monthly reports, private data, PR history, units, themes and younger-account safeguards intact.

## 1.6.32 highlights

- Makes the Gym Together page send real, notification-backed invites to confirmed friends.
- Lets a shared-session leader invite additional friends into the same workout room.
- Rebuilds Gym Together, Supplement Tracker, My Fitness Journey, Weekly Split and Customize FitHub with clearer controls and realistic FitHub artwork.
- Preserves supplement history when a reminder is removed, improves daily status editing, and keeps younger-account guidance neutral and support-led.
- Adds past-period navigation to Journey reports and image-led weekly workout planning.
- Keeps the Home, Food, Friends, You, popup, workout and notification improvements from earlier releases intact.

## Release identity

- App: `1.6.33`
- Android version code: `43`
- iOS build number: `43`
- APK artifact: `FitHub-1.6.33-APK`
- New SQL: `supabase/UPDATE_2026_09_02_FITHUB_1_6_32_ADDITIVE.sql`
- Edge Function code is unchanged; keep the existing `friend-notifications` deployment active.

## Deployment boundary

If FitHub 1.6.32 is already in GitHub, apply the 1.6.33 Journey patch and build a new APK. Use the complete package if the repository is older or uncertain.

Run the 1.6.32 additive SQL once before testing Gym Together or removing a supplement reminder. Never upload `.expo`, `node_modules`, `.env`, `google-services.json`, Android signing files, secrets or tokens.

## Younger-account safeguards

Younger accounts retain the neutral meal-journal safeguards: online nutrition search, barcode nutrition lookup and nutrition targets remain hidden. Load-based Clubs also remain hidden. Supplement tracking does not recommend a product or dose and continues to direct younger users toward parent, guardian or qualified-clinician support.
