# FitHub 1.6.6 Manual GitHub and APK Update Guide

This update is additive to your existing FitHub source. It does not require a Supabase migration.

## 1. Back up the current GitHub project

1. Open the current FitHub repository on GitHub.
2. Select **Code** → **Download ZIP** and keep that backup.
3. Do not delete the existing repository.

## 2. Upload the update manually

Use the supplied `FitHub_1.6.6_GITHUB_UPDATE.zip`.

1. Extract the ZIP on your computer.
2. Open your GitHub repository.
3. For files at the repository root, select **Add file** → **Upload files**, then upload:
   - `app.json`
   - `package.json`
   - `package-lock.json`
   - `CHANGELOG_1_6_6.md`
   - `FITHUB_1_6_6_MANUAL_GITHUB_AND_APK_GUIDE.md`
4. Open `src/data` in GitHub and upload `exerciseVisuals.ts`.
5. Open `src/screens/tabs` and upload `WorkoutTab.tsx`.
6. Open `assets`. Create `train_v3`, then create `male` and `female` inside it.
7. Upload every PNG from the update's `assets/train_v3/male` folder into GitHub's `assets/train_v3/male` folder.
8. Upload every PNG from `assets/train_v3/female` into `assets/train_v3/female`.
9. Open `.github/workflows`. Create or replace `build-apk.yml` with the supplied file if it is missing.
10. Commit each group with a clear message such as `FitHub 1.6.6 exercise visual update`.

GitHub's web uploader can upload folders when you drag them into the upload area. If a large folder fails, upload the PNGs in smaller batches of about 25–40 files. Do not upload `node_modules`, `.expo`, `android/build`, an APK, or any `.env` file.

## 3. Confirm the required GitHub layout

Your repository must contain these exact paths:

- `assets/train_v3/male/*.png`
- `assets/train_v3/female/*.png`
- `src/data/exerciseVisuals.ts`
- `src/screens/tabs/WorkoutTab.tsx`
- `.github/workflows/build-apk.yml`

The folder name is `train_v3` with an underscore. Keep all PNG filenames lowercase and unchanged.

## 4. Build the APK with GitHub Actions

1. Open the repository's **Actions** tab.
2. Select **Build FitHub APK**.
3. Select **Run workflow** → branch **main** → **Run workflow**.
4. Wait for the `android-apk` job to finish with a green check.
5. Open the completed run.
6. Scroll to **Artifacts** and download the FitHub APK artifact.
7. Extract the downloaded artifact ZIP to obtain the APK.

If the workflow starts automatically after an upload, use that newest run instead of starting another one.

## 5. Install on Android

1. Copy the new APK to the phone.
2. Keep the current FitHub APK installed if you want an in-place upgrade and preserved local app data.
3. Open the new APK and choose **Update**.
4. If Android reports a signing conflict, back up anything needed, uninstall the old development build, and install the new APK. A signing conflict means the previous APK was signed with a different key.
5. Allow installation from the browser or file manager only when Android asks.

The source folder does not need to exist on the phone. The APK contains the compiled app and bundled images.

## 6. Test the visual update

1. Open **Train** and check all eight muscle-group cards.
2. Open Chest, Back, Shoulders, Arms, Legs, Core, Full Body and Cardio.
3. Check that the pictured equipment matches the exercise name.
4. Specifically inspect EZ-bar curl, cable curl, preacher curl, swimming, rowing, SkiErg, StairMaster, hack squat, hip machines, kettlebell exercises and strongman carries.
5. Confirm every thumbnail shows the athlete's head and feet when the full body is relevant.
6. Change the FitHub theme and confirm the Train background, cards, text, borders, filters and plus buttons change with it.
7. Use a profile with female gender selected and confirm the female visual set appears.
8. Switch to a male profile and confirm the male visual set appears.
9. Add exercises, save a workout, begin it, reorder exercises and finish it to confirm existing Train functions still work.

## 7. Troubleshooting

- **Old images remain:** confirm both `assets/train_v3` folders were uploaded, then run a fresh GitHub Actions build. Delete the old downloaded APK before downloading the new artifact.
- **AAPT2 image error:** find the exact PNG named in the log and re-upload it from this update package; GitHub may have received an incomplete file.
- **Unable to load script:** install the release APK artifact, not a debug APK that expects Metro.
- **Workflow missing:** recreate `.github/workflows/build-apk.yml` in GitHub's file editor and commit it to `main`.
- **Red build:** open the failed step and use the first real `Error:` above `BUILD FAILED`; warnings alone are not the cause.
