# FitHub 1.6.21 Validation Report

## Passed locally

- Release versions align at app `1.6.21`, Android `31`, and iOS `31`.
- All 703 local source and asset references resolve across 47 source files.
- The changed Home, Food, Journey, icon, and shared-navigation TSX files passed delimiter and structural-balance checks.
- `app.json`, `package.json`, `package-lock.json`, and both generated JSON audit reports parse successfully.
- The exercise visual audit passed for 229 catalogue exercises and 472 unique exercise PNG references.
- Male/female exercise parity passed at 236 visual families each.
- PNG decoding, dimensions, alpha transparency, duplicate, parity, and detached-asset checks passed for 472 exercise, 16 muscle-group, and 2 Home PNGs.
- Home Quick Access cards retain their existing Journey, Nutrition, Supplements, Community, and Run Metrics destinations.
- Shared bottom navigation retains Home, Friends, Train, Food, and You routes with the raised Train action.
- Food search, barcode scanning, recent items, saved meals, diary actions, and water logging remain wired to their existing handlers.
- Younger-account safeguards remain active: meal journaling is available without calorie or macro targets, and Journey uses exercise consistency and technique-focused summaries instead of load or PR summaries.

See `reports/EXERCISE_VISUAL_AUDIT_1_6_21.md`, `reports/exercise-visual-audit.json`, and `reports/png-asset-audit.json`.

## Requires connected build and device testing

- GitHub Actions `npm ci` and strict TypeScript compilation.
- Android release generation through the included `Build FitHub APK` workflow.
- Physical-device comparison of Home and Food against the approved references at supported portrait screen sizes.
- Tap testing for every Home card, Food action, Journey metric, bottom-navigation item, Android Back action, and pull-to-refresh state.
- Light/dark/custom-theme, text-scaling, empty-data, long-content, and offline/error-state testing.

## Deployment note

FitHub 1.6.21 is a source/UI release. If 1.6.20 is already deployed, do not rerun its SQL migration or redeploy its Edge Functions solely for 1.6.21.
