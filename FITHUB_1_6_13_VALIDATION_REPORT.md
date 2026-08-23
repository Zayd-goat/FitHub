# FitHub 1.6.13 validation report

## Passed checks

- TypeScript: `tsc --noEmit`
- Exercise catalogue entries checked: 230
- Referenced visual families: 236
- Referenced male PNGs: 236
- Referenced female PNGs: 236
- Total referenced PNGs: 472
- Missing male/female mappings: 0
- Pending dedicated mappings: 0
- PNG decode errors: 0
- PNG structural/CRC errors: 0
- Incorrect referenced dimensions: 0
- Dark-corner background failures: 0
- Byte-identical duplicate hashes: 0
- Visual contact sheets reviewed: 20
- Second-pass visual corrections: 4 families
- Android Metro production export: passed
- Metro modules bundled: 1,436
- Assets packaged by export: 527
- Expo Android prebuild: passed
- Expo Android autolinking: passed
- Version: 1.6.13
- Android version code: 23

## Exercise-art review scope

Every referenced male/female family was rebuilt and reviewed for movement identity, equipment presence, single-frame presentation, complete framing, light background, visual consistency, and target-muscle overlays. The images are instructional illustrations; they are not a substitute for qualified in-person coaching or equipment guidance.

## Native APK

The production JavaScript/Hermes export, Android prebuild, and autolinking checks passed locally. The standalone release APK is compiled by `.github/workflows/build-apk.yml` after the source is uploaded to GitHub, where the Android/Gradle dependencies are available.

