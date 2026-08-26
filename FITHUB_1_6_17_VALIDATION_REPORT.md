# FitHub 1.6.17 Validation Report

Validation date: 25 August 2026

## Passed in this workspace

- `package.json`, `package-lock.json`, `app.json`, and `tsconfig.json` parse as valid JSON.
- Version alignment passed: app/package version `1.6.17`, Android version code `27`.
- 676 relative TypeScript/JavaScript imports and local asset references resolve to files.
- The new migration contains its transaction boundary, tables, policies, RPCs, triggers, and Realtime publication checks.
- All 492 current Train, muscle-group, and Home/rest PNG files decode successfully.
- All 492 production image hashes from the verified 1.6.16 baseline still match byte-for-byte.
- All 490 actively packaged exercise/group/rest images retain alpha transparency and four transparent corners.
- The existing full exercise report remains release-ready: 230 catalogue exercises, 472 unique male/female exercise assets, zero runtime mapping issues, zero parity issues, zero pending dedicated visuals, and zero unexpected duplicates.
- All new source and documentation files are included in the release manifest.
- Both release ZIPs pass archive-integrity testing after packaging.

## Validation performed by GitHub Actions

This workspace does not contain `node_modules` and cannot access the npm registry, so the dependency-based TypeScript, Expo export/prebuild, and native Gradle build are intentionally delegated to the supplied GitHub Actions workflow. The workflow runs:

```text
npm ci
npm run typecheck
npm run audit:exercise-visuals
npx expo prebuild --platform android --clean
./gradlew assembleRelease
```

Do not install an APK from a failed run. Download `FitHub-1.6.17-APK` only after every workflow step is green.

## Important boundaries

- The 1.6.17 additive SQL was statically inspected but was not executed against the user's live Supabase project.
- Confirmation email, password recovery, remote push, and Realtime shared workouts require the user's configured Supabase/Expo/Firebase services and physical-device testing.
- Automated image checks verify file integrity, transparency, parity, and runtime mapping. They do not replace qualified coaching review of exercise technique.
