# FitHub 1.6.23

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_23.md](START_HERE_FITHUB_1_6_23.md), then follow [FITHUB_1_6_23_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_23_COMPLETE_UPDATE_GUIDE.md).

## 1.6.23 highlights

- Implements the approved Home reference as native, responsive components, including the Today’s Plan equipment artwork, Your Week, Quick Access and Friend Feed.
- Implements the supplied Food reference as native, functional components with the exact diary hierarchy, four shortcuts, illustrated meal timeline and Water layout.
- Replaces every visible Home, Food and bottom-navigation icon with 32 purpose-built reference SVG components.
- Uses the approved raised teal Train button with a clean white horizontal dumbbell.
- Preserves existing routes, workout data, Food handlers, themes, feature hiding, pull-to-refresh and Android Back behaviour.

## Release identity

- App: `1.6.23`
- Android version code: `33`
- iOS build number: `33`
- APK artifact: `FitHub-1.6.23-APK`
- New SQL or Edge Function for 1.6.23: none

## Deployment boundary

If FitHub 1.6.22 is already fully deployed, 1.6.23 can be applied with the patch-only file list in the guide and a new APK build. Do not rerun an older migration or redeploy an Edge Function solely for this UI release.

The app uses only a Supabase publishable/anon key. Never add service-role keys, SMTP passwords, FatSecret secrets, Firebase service-account keys, Android signing keys, tokens, or a real `.env` file to GitHub or the APK.

## Younger-account safeguards

Younger accounts keep a neutral meal journal but do not receive online nutrition search, barcode scanning, calorie/macro targets, or load-based progress pressure. Home continues to focus on workouts, activity, consistency, recovery, and community participation.

## Design basis

The redesign follows current platform guidance for adaptable layouts, touch accessibility, and five-destination bottom navigation:

- Android accessibility: https://developer.android.com/guide/topics/ui/accessibility/apps
- Android adaptive layouts: https://developer.android.com/develop/ui/views/layout/use-window-size-classes
- Material navigation bars: https://m3.material.io/components/navigation-bar
- Material cards: https://m3.material.io/components/cards/guidelines
