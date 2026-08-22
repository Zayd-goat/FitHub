# FitHub 1.6.11 validation report

## Passed

- `tsc --noEmit`
- Exercise visual PNG validation
- 230 exercise catalogue records discovered
- Male/female referenced-asset parity
- Expo Android production export in offline mode
- Metro bundled 1,227 modules
- Expo exported 318 assets and one Android Hermes application bundle

## Build automation

`.github/workflows/build-apk.yml` installs Node 22 and Java 17, runs `npm ci`, TypeScript validation, the visual audit, Expo Android prebuild, Gradle release assembly, and uploads the APK artifact.

## Important visual-audit boundary

`reports/exercise-visual-audit.json` is the source of truth. At packaging time it reports:

- 230 catalogue exercises
- 136 male visual families
- 136 female visual families
- 272 referenced PNG files checked
- 0 male/female parity errors
- 100 exercises pending a unique dedicated movement illustration review

Those 100 exercises remain mapped through the existing reviewed visual-family system. The build is functional, but this report does not claim that every catalogue entry has its own uniquely created illustration.

## Device checks still required

- Install the generated release APK on a physical Android phone.
- Test notification actions while the app is backgrounded and closed.
- Test Bluetooth FTMS with each supported equipment model.
- Test camera/barcode permission and live food-provider requests.
- Test layout on small and large screens and in every user-created theme.

