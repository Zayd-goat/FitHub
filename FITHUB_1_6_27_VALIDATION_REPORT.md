# FitHub 1.6.27 Validation Report

## Release checked

- App version: `1.6.27`
- Android versionCode: `37`
- iOS buildNumber: `37`
- Upgrade base: complete FitHub `1.6.26`

## Completed local checks

| Check | Result |
|---|---|
| Relative source and asset references | Passed — 728 references across 54 source files |
| Home, Food, navigation and Community safeguards | Passed — 60 checks |
| New mini-scene PNGs | Passed — five square RGBA PNG sheets with real transparency |
| PNG integrity audit | Passed — 472 exercise, 16 group and 12 Home PNGs |
| Visible navigation family | Passed — five new original components |
| React Native build-error source | Passed — `absoluteFillObject` removed from FoodTab |
| Touch targets | Passed — meal and water actions remain 48–50 dp |
| Younger-profile safeguards | Passed — online search, scanning, nutrition targets and load-based Clubs remain age-gated |

## Behaviour preserved by source inspection

- Home calendar, workout count and active minutes still come from completed workout history.
- Every Quick Access card retains its existing route.
- Food search, scanning, saved meals, recent history, meal controls and water controls retain their handlers.
- Pull-to-refresh, Android Back handling, themes and accessibility labels remain connected.
- No Supabase schema, function, secret, cron or notification change is included.

## Checks that must run in GitHub

The local recovery workspace does not include installed npm dependencies, so local TypeScript compilation, Expo prebuild and APK compilation are not claimed as complete. The included GitHub workflow performs:

1. `npm ci`
2. `npm run typecheck`
3. All source and asset audits
4. Expo Android prebuild
5. Android release APK compilation

Install only after every GitHub workflow stage is green. Physical-device testing is still required for interaction, theme and screen-size verification.
