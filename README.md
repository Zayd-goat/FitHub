# FitHub 1.6.26

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness app backed by Supabase.

Start with [START_HERE_FITHUB_1_6_26.md](START_HERE_FITHUB_1_6_26.md), then follow [FITHUB_1_6_26_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_26_COMPLETE_UPDATE_GUIDE.md).

## 1.6.26 highlights

- Rebuilds the Food diary to match the approved FitHub preview.
- Adds 15 original, theme-aware Food SVG components for the diary hero, quick actions, meals, hydration and background.
- Improves spacing, touch targets, typography, hierarchy and the meal timeline.
- Keeps Search, Scan, Recent, Saved Meals, meal expansion, food logging, saved meals and water tracking working.
- Preserves every Home, Community, workout, social, notification and navigation update from 1.6.25.

## Release identity

- App: `1.6.26`
- Android version code: `36`
- iOS build number: `36`
- APK artifact: `FitHub-1.6.26-APK`
- New SQL or Edge Function for 1.6.26: none

## Deployment boundary

If the complete FitHub 1.6.25 release is already deployed, 1.6.26 can be applied with the patch ZIP and a new APK build. Do not rerun an older migration or redeploy an Edge Function solely for this UI release.

The app uses only a Supabase publishable/anon key. Never add service-role keys, SMTP passwords, FatSecret secrets, Firebase service-account keys, Android signing keys, tokens, or a real `.env` file to GitHub or the APK.

## Younger-account safeguards

Younger accounts keep the existing neutral meal-journal safeguards: online nutrition search, barcode nutrition lookup and nutrition targets remain hidden. Load-based Clubs also remain hidden.

## Design basis

The redesign follows current platform guidance for adaptable layouts, touch accessibility, and five-destination bottom navigation:

- Android accessibility: https://developer.android.com/guide/topics/ui/accessibility/apps
- Android adaptive layouts: https://developer.android.com/develop/ui/views/layout/use-window-size-classes
- Material navigation bars: https://m3.material.io/components/navigation-bar
- Material cards: https://m3.material.io/components/cards/guidelines
