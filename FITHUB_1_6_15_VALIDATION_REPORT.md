# FitHub 1.6.15 Validation Report

Validation status: **PASS**

## Release identity

| Item | Result |
|---|---:|
| App version | 1.6.15 |
| Android version code | 25 |
| APK artifact name | FitHub-1.6.15-APK |

## Automated checks

| Check | Result |
|---|---|
| npm ci using the lockfile | Pass |
| TypeScript tsc --noEmit | Pass |
| Expo Android prebuild | Pass |
| Expo Android production export | Pass |
| Catalogue exercises evaluated at runtime | 230 |
| Runtime-resolved exercises | 230 |
| Unique exercise PNGs decoded | 472 |
| Male exercise PNGs | 236 |
| Female exercise PNGs | 236 |
| Muscle-group PNGs decoded | 16 |
| Rest Day PNGs decoded | 2 |
| Missing/unresolved mappings | 0 |
| Male/female parity issues | 0 |
| Unreferenced exercise files | 0 |
| Unexpected byte-identical duplicates | 0 |
| Exercises pending exact visual coverage | 0 |

The full machine-readable result is in reports/exercise-visual-audit.json.

## PNG checks applied

Every referenced exercise image, group figure, and Rest Day image was checked for:

- valid PNG signature;
- complete chunk boundaries and CRC values;
- valid IHDR, IDAT, and IEND data;
- expected dimensions;
- non-interlaced 8-bit alpha channel;
- successful row-filter decoding;
- at least 2% transparent pixels;
- transparent outer corners;
- male/female filename parity;
- missing, orphaned, and unexpected duplicate files.

## Android export

- Metro modules bundled: 1,436
- Packaged assets: 527
- Hermes Android bundle: approximately 3.4 MB

## Native APK note

The source-level Android generation and production JavaScript bundle passed locally. The signed release APK is compiled by the included GitHub Actions workflow, where the Android SDK and Gradle distribution are provisioned. A successful workflow run produces the FitHub-1.6.15-APK artifact.

## Database impact

- New SQL migration: none
- Live Supabase reset required: no
- Existing migrations to rerun: none

## Accuracy boundary

The audit proves that every catalogue entry resolves to its approved male and female asset and that every file is present, decodable, transparent, correctly packaged, and not an unresolved fallback. Automated checks cannot replace a qualified human biomechanics review of every illustrated pose; the device test checklist in the update guide includes visual spot-checks across every category.
