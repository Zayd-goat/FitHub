# FitHub 1.6.20 Validation Report

## Passed locally

- Release versions align at app `1.6.20`, Android `30`, and iOS `30`.
- All 702 local source and asset references resolve.
- Exercise visual audit passed for 229 exercises and 472 unique exercise PNG references.
- Male/female exercise parity passed at 236 visual families each.
- PNG decoding, dimensions, transparency, duplicate, and detached-asset checks passed for exercise, group, and Home artwork.
- Changed TypeScript/TSX files passed delimiter and structural balance checks.
- `app.json`, `package.json`, and `package-lock.json` parse successfully.

See `reports/EXERCISE_VISUAL_AUDIT_1_6_20.md`, `reports/exercise-visual-audit.json`, and `reports/png-asset-audit.json`.

## Requires connected deployment testing

- GitHub Actions `npm ci` and strict TypeScript check.
- Supabase 1.6.20 migration against the live project.
- Edge Function deployment and authenticated immediate response invocation.
- Android APK build and physical-device UI/gesture testing.
- Two-account accepted/declined gym-invite push testing.
