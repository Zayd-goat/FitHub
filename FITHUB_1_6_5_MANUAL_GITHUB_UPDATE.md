# FitHub 1.6.5 manual GitHub update

This release is a visual/code update only. Do not rerun older Supabase migrations.

## 1. Back up the current GitHub repository

On GitHub, open the FitHub repository, select **Code**, then **Download ZIP**. Keep that ZIP unchanged as the rollback copy.

## 2. Upload the 1.6.5 files

Open the extracted `FitHub_1.6.5_TRAIN_VISUAL_UPDATE` folder. In GitHub, open the repository root, choose **Add file → Upload files**, then upload the contents of the update folder—not the outer folder itself.

Make sure these items are included:

- `assets/train_v2/groups/`
- `assets/train_v2/movements/`
- `src/screens/tabs/WorkoutTab.tsx`
- `app.json`
- `package.json`
- `package-lock.json`
- `CHANGELOG_1_6_5.md`

If GitHub will not accept a complete folder, create the matching folder path with **Add file → Create new file**, enter a temporary filename, commit it, then upload the image files into that folder. Repeat for `groups` and `movements`.

## 3. Commit the files

Use commit message:

`FitHub 1.6.5 Train visual catalogue`

Commit directly to the branch used by the APK workflow, normally `main`.

## 4. Confirm the workflow exists

The repository must contain `.github/workflows/build-apk.yml` (or the existing APK workflow filename). Open the **Actions** tab and confirm the FitHub APK workflow starts after the commit.

## 5. Build the APK

If the workflow does not start automatically:

1. Open **Actions**.
2. Select the FitHub APK workflow.
3. Select **Run workflow**.
4. Choose `main`.
5. Select **Run workflow** again.

Wait for the green check mark. Open the completed run and download the APK artifact from the **Artifacts** section.

## 6. Install the update

Transfer the APK to the Android phone, open it, allow installation from the browser or file manager when Android asks, and install it over the existing FitHub app. The package remains `com.fithub.app`, and versionCode 15 is higher than the prior release, so Android should treat it as an update and retain app data.

## 7. Test

- Open Train and confirm the dark muscle grid appears.
- Open every muscle group and confirm exercise thumbnails appear.
- Test All, Barbell, Dumbbell, Machine and Bodyweight filters.
- Add and remove exercises.
- Save, edit and start a workout.
- Close and reopen the app during a workout and confirm the session is recoverable.
- Complete a workout and confirm history and PR handling still work.
- Test Cardio and Connect Equipment separately.
