# FitHub 1.6.22

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_22.md](START_HERE_FITHUB_1_6_22.md), then follow [FITHUB_1_6_22_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_22_COMPLETE_UPDATE_GUIDE.md).

## 1.6.22 highlights

- Rebuilds Home around a clear Today’s Plan, responsive Your Week summary, readable two-column Quick Access grid, full-width Run Metrics entry, and Friend Feed.
- Rebuilds Food around one primary add/search action, compact shortcuts, full-width meal cards, clearer Water controls, and an expandable Nutrition overview.
- Replaces every icon visible on Home, Food, and the bottom navigation with 35 original theme-aware SVG components built for FitHub.
- Prevents narrow-screen text failures such as five-line Community labels and broken active-minute values.
- Adds 48 dp interaction targets and enough lower-page clearance so the floating navigation does not cover content.
- Preserves all existing routes, workout data, Food handlers, themes, feature hiding, pull-to-refresh, and Back behavior.

## Release identity

- App: `1.6.22`
- Android version code: `32`
- iOS build number: `32`
- APK artifact: `FitHub-1.6.22-APK`
- New SQL or Edge Function for 1.6.22: none

## Deployment boundary

If FitHub 1.6.20 or later is already fully deployed, 1.6.22 needs only the source replacement and a new APK build. Do not rerun an older migration or redeploy an Edge Function solely for this UI release.

The app uses only a Supabase publishable/anon key. Never add service-role keys, SMTP passwords, FatSecret secrets, Firebase service-account keys, Android signing keys, tokens, or a real `.env` file to GitHub or the APK.

## Younger-account safeguards

Younger accounts keep a neutral meal journal but do not receive online nutrition search, barcode scanning, calorie/macro targets, or load-based progress pressure. Home continues to focus on workouts, activity, consistency, recovery, and community participation.

## Design basis

The redesign follows current platform guidance for adaptable layouts, touch accessibility, and five-destination bottom navigation:

- Android accessibility: https://developer.android.com/guide/topics/ui/accessibility/apps
- Android adaptive layouts: https://developer.android.com/develop/ui/views/layout/use-window-size-classes
- Material navigation bars: https://m3.material.io/components/navigation-bar
- Material cards: https://m3.material.io/components/cards/guidelines
