# FitHub 1.6.13 full GitHub update guide

This ZIP is a complete source update. It can repopulate an empty FitHub repository.

## Important first rule

Do **not** upload `FitHub_1.6.13_COMPLETE_UPDATE.zip` to the repository as one ZIP file. GitHub stores an uploaded ZIP but does not unpack it into the app. Download it, extract it, and upload/copy the contents inside the extracted folder.

## Recommended method: GitHub Desktop

This is the safest method because the update contains hundreds of exercise assets.

1. Download and extract `FitHub_1.6.13_COMPLETE_UPDATE.zip`.
2. Open GitHub Desktop.
3. Clone or open your FitHub repository.
4. In GitHub Desktop choose **Repository > Show in Explorer**.
5. Open the extracted update folder in a second Explorer window.
6. Select everything **inside** the extracted FitHub folder and copy it into the local repository folder.
7. Do not copy the enclosing folder itself. The repository root must contain `App.tsx`, `app.json`, `package.json`, `assets`, `src`, `scripts`, and `supabase` directly.
8. Return to GitHub Desktop and review the file list.
9. Use commit message: `FitHub 1.6.13 complete UI and exercise update`.
10. Click **Commit to main** and then **Push origin**.

## Browser-only method

1. Extract the complete update ZIP on your computer.
2. Open the FitHub repository on GitHub and select `main`.
3. If the repository is empty, choose **uploading an existing file**. Otherwise choose **Add file > Upload files**.
4. Drag the contents inside the extracted update folder into the upload area.
5. If the browser rejects a large batch, upload the root files and folders separately.
6. For the largest folder, upload these two folders separately:
   - `assets/train_v3/male`
   - `assets/train_v3/female`
7. Each final gender folder must contain 236 PNG files.
8. Confirm that the folder paths are exactly:
   - `assets/train_v3/male/...`
   - `assets/train_v3/female/...`
   - `assets/train_v4/groups/male/...`
   - `assets/train_v4/groups/female/...`
   - `assets/home/rest_day_male.png`
   - `assets/home/rest_day_female.png`
9. Do not create nested paths such as `assets/train_v3/train_v3` or `FitHub/assets`.
10. Commit with: `FitHub 1.6.13 complete UI and exercise update`.

### If `.github` does not appear

1. Choose **Add file > Create new file**.
2. Enter `.github/workflows/build-apk.yml` as the filename.
3. Copy the matching file from the extracted update into GitHub.
4. Commit it to `main`.

## Files and folders you should see at the repository root

- `.github`
- `assets`
- `reports`
- `scripts`
- `src`
- `supabase`
- `.env.example`
- `.gitignore`
- `App.tsx`
- `app.json`
- `package.json`
- `package-lock.json`
- `tsconfig.json`

The supplied `.env.example` contains placeholders only. Never upload a real `.env` file, Supabase service-role key, or private credential.

## Supabase

- Replacing the repository's `supabase` folder with the one from this exact ZIP is safe.
- Replacing source files does not automatically rerun database migrations or deploy Edge Functions.
- Version 1.6.13 adds no new SQL migration.
- Do not rerun old migrations.

## GitHub secrets

Open **Settings > Secrets and variables > Actions** and confirm these repository secrets exist:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Use the public publishable/anon key, never the service-role key. The optional `EXPO_PUBLIC_FITHUB_DOWNLOAD_URL` belongs under repository **Variables**, not secrets.

## Command Prompt

You do not need to rerun anything in Command Prompt when using the included GitHub Actions workflow. GitHub installs dependencies and runs all checks itself.

Optional local developer checks are:

```text
npm ci
npm run typecheck
npm run audit:exercise-visuals
```

## Build the APK

1. Open the repository's **Actions** tab.
2. Select **Build FitHub APK**.
3. Click **Run workflow**.
4. Select `main` and start the run.
5. Wait for these steps to turn green:
   - Install dependencies
   - Type-check application
   - Audit every exercise visual
   - Generate Android project
   - Verify Android autolinking
   - Build standalone release APK
6. Open the successful run and scroll to **Artifacts**.
7. Download `FitHub-1.6.13-APK`.
8. Extract the artifact and install `FitHub.apk` on the Android phone.
9. If Android reports a signing conflict with an older APK, preserve any device-only data, uninstall the old APK, and then install the new one.

## Final app test checklist

1. Change between every FitHub theme and confirm Home and Train surfaces, borders, typography, and buttons update.
2. Confirm anatomical target muscles remain red in every theme.
3. Check all eight Train groups with both male and female profile selections.
4. Open exercises from every category and confirm the light background, complete equipment, single movement frame, name, and target area.
5. Use Search and each equipment filter.
6. Select exercises and test both **Preview Workout** and **Start Now**.
7. Reorder exercises in Preview, then start the workout.
8. Test Saved Workouts, Repeat Last Workout, Android Back, and active-workout recovery.
9. Confirm Home changes artwork with the scheduled split and shows the dedicated recovery state on Rest Day.
10. Open Supplements, change months, select dates, and verify the supplement-specific daily agenda.

