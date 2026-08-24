# FitHub 1.6.16 Validation Report

Validation date: 24 August 2026

## Passed

- Clean dependency installation from `package-lock.json`: 521 packages.
- TypeScript: `tsc --noEmit` passed with zero errors.
- Exercise visual audit: passed.
- Android production export: passed.
- Android native prebuild: passed with the Firebase configuration path enabled.
- Android Google Services Gradle plugin was added by prebuild.
- Notification Edge Function TypeScript syntax: passed.
- ZIP contents and integrity are tested after packaging.

## Exercise audit results

- Catalogue exercises: 230
- Runtime-resolved exercises: 230
- Exercise PNG references: 472
- Unique exercise PNGs: 472
- Male assets: 236
- Female assets: 236
- Muscle-group assets: 16
- Rest Day assets: 2
- Runtime mapping issues: 0
- Gender parity issues: 0
- Missing or orphaned exercise assets: 0
- Unexpected byte-identical duplicates: 0
- Pending dedicated visual mappings: 0
- Detached alpha artifacts after cleanup: 0

The audit checks PNG signature, chunk bounds and CRC, complete IDAT decoding, dimensions, alpha channel, row filters, transparent-pixel ratio, transparent corners, disconnected alpha components, edge fragments, runtime mapping, gender parity, duplicates, and orphan files. The complete machine-readable result is `reports/exercise-visual-audit.json`.

The cleanup pass checked all 472 exercise images, changed 277 that contained removable alpha debris, and removed 1,172 detached fragments. The male and female T-Bar Row images were then replaced and separately checked on light and dark composites.

## Android export result

- Entry module: `index.js`
- Metro modules: 1,436
- Packaged assets: 527
- Android Hermes bundle: approximately 3.4 MB

## Important boundaries

- The native Android project was generated successfully, but a final APK was not compiled locally. The supplied GitHub Actions workflow performs the release APK compilation in the configured Android environment.
- The additive migration was inspected but was not executed against the user's live Supabase database from this workspace.
- Remote notification delivery was not end-to-end tested because it requires the user's real Expo project, Firebase configuration, Supabase deployment, push credentials, and two physical signed-in devices.
- Automated image checks prove file integrity, transparency, parity, and exact runtime mapping. They do not replace qualified coaching or clinical review of exercise technique.
