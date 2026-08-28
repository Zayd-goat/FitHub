# FitHub 1.6.18 Validation Report

Validation date: 25 August 2026

## Passed locally

- `app.json`, `package.json`, `package-lock.json`, `tsconfig.json`, and `eas.json` parse as valid JSON.
- `.github/workflows/build-apk.yml` parses as valid YAML.
- Version alignment passed: app/package/lock version `1.6.18`; Android version code `28`.
- Expo project ID matches `3d3a3683-79bb-4711-ae01-1dab82cc21e7`.
- The workflow contains locked dependency installation, TypeScript check, runtime exercise audit, clean Android prebuild, Gradle APK build, and artifact upload.
- 696 relative source imports and local asset references resolve to files.
- No direct age-sensitive UI access bypasses the birthday-aware `profileAge` helper.
- The 1.6.18 migration contains its transaction boundary, birthday/age trigger, private notification table, RLS, triggers, backfill, retry fields, and Realtime publication.
- No `.env`, `google-services.json`, Firebase service-account JSON, Android keystore, APK, or AAB is included in the source.
- `scripts/clean-exercise-alpha.sh` passes shell syntax validation.

## Exercise and image results

- 230 unique catalogue exercises.
- 472 referenced exercise PNGs.
- 236 male and 236 female exercise PNGs.
- Zero missing references.
- Zero unreferenced exercise files.
- Zero male/female filename parity issues.
- Zero byte-identical duplicate groups.
- All exercise assets decode as 768×512 PNGs with alpha and transparent corners.
- Zero detached alpha/background artifacts remain after 235 tiny fragments were removed from 89 images.
- All 16 muscle-group PNGs and both Rest Day PNGs decode at the required dimensions.
- The complete male/female exercise set received a conservative alpha/background pass.
- Corrected T-Bar Row, Decline Sit-Up, and Dumbbell Lateral Raise male/female assets were visually inspected.

See `reports/EXERCISE_VISUAL_AUDIT_1_6_18.md` and `reports/exercise-visual-audit.json`.

## GitHub Actions validation still required

This workspace has no installed `node_modules` and cannot retrieve npm packages here. Therefore dependency-based TypeScript checking, runtime TypeScript visual resolution, Expo prebuild, and native Gradle compilation are intentionally delegated to the included GitHub Actions workflow:

```text
npm ci
npm run typecheck
npm run audit:exercise-visuals
npx expo prebuild --platform android --clean
./gradlew assembleRelease
```

Download `FitHub-1.6.18-APK` only after every workflow step is green.

## External-service and physical-device boundaries

- The additive SQL was statically inspected but was not executed against the live FitHub Supabase database in this workspace.
- Confirmation email and password recovery require the user's Supabase Confirm Email, redirect URL, Custom SMTP, and template settings.
- Remote gym-invite push requires matching Firebase `google-services.json`, Expo FCM V1 credentials, the GitHub values, a deployed Edge Function, and its cron job.
- Realtime shared workouts, system notification actions, email deep links, and Android installation require two-account/physical-device testing.
- Automated image checks verify files, mappings, alpha, dimensions, parity, and duplicates. They do not replace qualified coaching review of every illustrated movement.
