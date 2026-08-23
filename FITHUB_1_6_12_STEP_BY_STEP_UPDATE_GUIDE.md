# FitHub 1.6.12 complete update guide

## Before replacing anything

1. Download the complete update ZIP and extract it.
2. Keep a backup copy of the current repository.
3. Never upload a real `.env` file or Supabase service-role key.
4. Do not run old Supabase SQL migrations again. This update adds no new migration.

## Recommended: replace with GitHub Desktop

1. Open the FitHub repository in GitHub Desktop.
2. Choose **Repository > Show in Explorer**.
3. Copy everything inside the extracted update folder into the local FitHub repository.
4. When Windows asks, choose **Replace the files in the destination**.
5. Replacing the complete `assets` folder is safe with this ZIP because it contains the complete replacement asset tree, including `assets/train_v3/male` and `assets/train_v3/female`.
6. Replacing `src`, `scripts`, and `supabase` with the matching folders from this same ZIP is also safe. Do not mix folders from older ZIP versions.
7. Return to GitHub Desktop and review the changed-file list.
8. Use commit message `FitHub 1.6.12 complete visual update`.
9. Click **Commit to main**, then **Push origin**.

## GitHub website/editor method

1. Open the repository and press `.` to launch the browser editor.
2. Delete only the folders you intend to replace, such as `assets`, `src`, `scripts`, or `supabase`.
3. Open **Source Control** in the left sidebar.
4. Enter `Remove old FitHub update folders`, then click **Commit & Push**.
5. Return to the normal repository page and use **Add file > Upload files**.
6. Upload the contents of the extracted update folder. For large assets, upload `assets/train_v3/male` and `assets/train_v3/female` separately.
7. Confirm the final paths are exactly:
   - `assets/train_v3/male/...`
   - `assets/train_v3/female/...`
8. Do not allow nested paths such as `assets/train_v3/train_v3/...`.
9. Commit the upload with `Upload FitHub 1.6.12 complete update`.

## Supabase folder

The repository `supabase` folder contains project source such as Edge Functions and migrations. It is safe to replace that folder with the `supabase` folder from this exact update ZIP. Replacing repository files does not automatically rerun database migrations or deploy Edge Functions. Do not manually rerun old migrations for version 1.6.12.

## Command Prompt

You do not need to run commands in the FitHub folder when using the supplied GitHub Actions APK workflow. Local commands are optional for developers only:

```text
npm ci
npm run typecheck
npm run audit:exercise-visuals
```

## Build the APK

1. In GitHub, open **Actions**.
2. Select **Build FitHub APK**.
3. Click **Run workflow**, select `main`, and run it.
4. Wait for TypeScript, exercise audit, Android generation, and release build to turn green.
5. Open the successful run and download the APK artifact.
6. Extract it and install the APK on the Android phone.

## Test checklist

1. Switch between every available app theme and confirm Home and Train colors change.
2. Confirm muscle targets stay red in every theme.
3. Check all eight Train groups in both male and female profiles.
4. Open several exercises from every muscle group and confirm the image, equipment, name, and target area agree.
5. Create a workout and test both Preview and Start Now.
6. Test saved workouts, active-workout recovery, and Android Back.
7. Confirm the Home plan changes with the scheduled split and shows a Rest Day state on rest days.
8. Open Supplements, change months, select a date, and verify the daily agenda.

