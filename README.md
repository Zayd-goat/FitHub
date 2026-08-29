# FitHub 1.6.24

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_24.md](START_HERE_FITHUB_1_6_24.md), then follow [FITHUB_1_6_24_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_24_COMPLETE_UPDATE_GUIDE.md).

## 1.6.24 highlights

- Implements the final approved Home preview as the locked native React Native composition.
- Adds the new transparent bench/rack/barbell/shaker/towel artwork and subtle gym-pattern backdrop.
- Uses the approved compact in-card Your Week summary, Quick Access proportions and single-item Friend Feed.
- Uses refreshed native SVG icons and the approved slim bottom dock with raised Train control.
- Preserves live workout data, rest-day handling, routes, themes, pull-to-refresh and Android Back behaviour.

## Release identity

- App: `1.6.24`
- Android version code: `34`
- iOS build number: `34`
- APK artifact: `FitHub-1.6.24-APK`
- New SQL or Edge Function for 1.6.24: none

## Deployment boundary

If the complete FitHub 1.6.23 release is already deployed, 1.6.24 can be applied with the patch ZIP and a new APK build. Do not rerun an older migration or redeploy an Edge Function solely for this UI release.

The app uses only a Supabase publishable/anon key. Never add service-role keys, SMTP passwords, FatSecret secrets, Firebase service-account keys, Android signing keys, tokens, or a real `.env` file to GitHub or the APK.

## Younger-account safeguards

Younger accounts keep a neutral meal journal but do not receive online nutrition search, barcode scanning, calorie/macro targets, or load-based progress pressure. Home continues to focus on workouts, activity, consistency, recovery, and community participation.

## Design basis

The redesign follows current platform guidance for adaptable layouts, touch accessibility, and five-destination bottom navigation:

- Android accessibility: https://developer.android.com/guide/topics/ui/accessibility/apps
- Android adaptive layouts: https://developer.android.com/develop/ui/views/layout/use-window-size-classes
- Material navigation bars: https://m3.material.io/components/navigation-bar
- Material cards: https://m3.material.io/components/cards/guidelines
