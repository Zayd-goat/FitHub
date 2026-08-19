# FitHub 1.6.4 one-go update guide

This package is the full FitHub source update, not only a backup. It keeps Android package `com.fithub.app`, so the APK can install over the existing FitHub app. Version is 1.6.4 and Android versionCode is 14.

## 1. Back up first

1. Download the current GitHub repository as a ZIP.
2. In Supabase, open Database > Backups and confirm a recent backup exists.
3. Do not rerun old migrations that your project already has.

## 2. Upload everything manually through the GitHub website

No Command Prompt or Git commands are needed for this method.

### 2A. Prepare the update folder

1. Extract `FitHub_1.6.4_COMPLETE_UPDATE.zip`.
2. Open the extracted `FitHub` folder.
3. Do not upload the ZIP itself.
4. Do not upload `node_modules`, `.expo`, `android`, `ios`, a real `.env`, an APK, an AAB, or any secret/token.

The update package deliberately excludes generated dependency and Android build folders. GitHub Actions recreates them.

### 2B. Open the correct repository and branch

1. Sign in to GitHub.
2. Open the repository currently used to build FitHub.
3. Above the file list, confirm the branch selector says `main`.
4. If the repository contains old FitHub source, keep it open: uploading a file with the same path replaces that file after you commit.

Manual upload does not automatically remove an obsolete file that exists only in the old repository. This update is designed to overwrite the current source paths. If GitHub still contains an old step-counter file after the upload, delete that specific obsolete file using its `…` menu > Delete file.

### 2C. Upload the normal root files

1. Click **Add file**.
2. Click **Upload files**.
3. From the extracted FitHub folder, select the normal visible root files, including:
   - `App.tsx`
   - `app.json`
   - `eas.json`
   - `package.json`
   - `package-lock.json`
   - `tsconfig.json`
   - `README.md`
   - all supplied changelog and guide `.md` files
4. Drag the selected files onto the GitHub upload area.
5. At the bottom, enter `Upload FitHub 1.6.4 root files`.
6. Select **Commit directly to the main branch**.
7. Click **Commit changes**.

GitHub's browser upload accepts no more than 100 files in one batch and limits each browser-uploaded file to 25 MiB. This FitHub package can therefore be uploaded safely in the separate batches below.

### 2D. Upload the `assets` folder

1. Return to the repository's main page.
2. Click **Add file > Upload files**.
3. Drag the entire `assets` folder from File Explorer into the GitHub upload box.
4. Wait until all asset paths appear. The paths must start with `assets/`.
5. Commit with the message `Update FitHub 1.6.4 assets`.

Do not open `assets` and upload its contents at the repository root. Drag the folder itself so its subfolders and paths are preserved.

### 2E. Upload the `src` folder

1. Click **Add file > Upload files** again.
2. Drag the complete `src` folder into the upload box.
3. Confirm the displayed paths start with `src/`.
4. Commit with the message `Update FitHub 1.6.4 application source`.

### 2F. Upload the `supabase` folder

1. Click **Add file > Upload files** again.
2. Drag the complete `supabase` folder into the upload box.
3. Confirm the paths start with `supabase/` and include:
   - `supabase/UPDATE_2026_08_19_FITHUB_1_6_4_ADDITIVE.sql`
   - `supabase/functions/nutrition-proxy/index.ts`
   - `supabase/functions/food-search/index.ts`
   - `supabase/functions/friend-notifications/index.ts`
4. Commit with the message `Update FitHub 1.6.4 Supabase files`.

### 2G. Create the hidden GitHub Actions workflow manually

Windows may hide `.github`, so create the workflow directly on GitHub:

1. From the repository main page, click **Add file > Create new file**.
2. In **Name your file**, enter exactly:

```text
.github/workflows/build-apk.yml
```

3. On your computer, open `.github`, then `workflows`, then `build-apk.yml` using Notepad.
4. Press `Ctrl+A`, then `Ctrl+C`.
5. Paste the contents into the GitHub editor.
6. Click **Commit changes**.
7. Use the message `Create FitHub APK workflow` and commit directly to `main`.

The spelling must be `.github/workflows/build-apk.yml`—including the leading dot and the plural `workflows`.

### 2H. Create `.gitignore` manually

1. Click **Add file > Create new file**.
2. Enter `.gitignore` as the filename.
3. Paste this content:

```text
node_modules/
.expo/
android/
ios/
.env
*.jks
*.keystore
build.json
*.apk
*.aab
```

4. Commit it directly to `main` with the message `Create gitignore`.

### 2I. Create `.env.example` manually

1. Click **Add file > Create new file**.
2. Enter `.env.example` as the filename.
3. Open the package's `.env.example` in Notepad and paste its example placeholders into GitHub.
4. Confirm it contains placeholders only—not your real Supabase values or FatSecret secret.
5. Commit with the message `Create environment example`.

### 2J. Final upload check

The repository root should now show at least:

- `.github`
- `assets`
- `src`
- `supabase`
- `.env.example`
- `.gitignore`
- `App.tsx`
- `app.json`
- `eas.json`
- `package.json`
- `package-lock.json`
- `tsconfig.json`

Open `.github/workflows/build-apk.yml` on GitHub and verify it is not empty. Do not build the APK until all four upload batches and the three hidden-file steps are complete.

## 3. Apply only the new additive database migration

1. Sign in at Supabase and open the same FitHub project.
2. Open SQL Editor > New query.
3. Open `supabase/UPDATE_2026_08_19_FITHUB_1_6_4_ADDITIVE.sql` from this package.
4. Copy the entire SQL file into the Supabase SQL editor.
5. Click Run once.
6. A successful run shows success/no rows. Do not run the older baseline migrations again.

This creates only the new reaction, comment moderation, visibility, and current-club data needed by 1.6.4. It uses `IF NOT EXISTS`/policy replacement where appropriate and does not recreate the existing nutrition, supplement, workout, challenge, or notification features.

## 4. Edge Functions and secrets

No brand-new Edge Function is required specifically for 1.6.4. Keep the existing functions deployed:

- `nutrition-proxy`
- `food-search`
- `friend-notifications`

If any is not deployed, open Command Prompt in the FitHub folder and run:

```bat
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REFERENCE
npx supabase functions deploy nutrition-proxy
npx supabase functions deploy food-search
npx supabase functions deploy friend-notifications
```

Set FatSecret credentials only as Supabase secrets, never in Android or GitHub source:

```bat
npx supabase secrets set FATSECRET_CLIENT_ID=YOUR_CLIENT_ID FATSECRET_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

Use the upgraded FatSecret application's OAuth 2.0 client ID and secret from the FatSecret Platform developer dashboard. Do not paste either secret into `app.json`, `.env.example`, source code, or GitHub Actions.

## 5. Check GitHub Actions secrets

In GitHub, open Repository > Settings > Secrets and variables > Actions. Under Repository secrets, confirm:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

These are the project URL and publishable/anon client key, not the database password and not the service-role key.

## 6. Build the APK

1. Open the repository's Actions tab.
2. Select `Build FitHub APK`.
3. Choose Run workflow > main > Run workflow.
4. Wait for the green check.
5. Open the completed run.
6. Under Artifacts, download `FitHub-APK`.
7. Extract it to obtain `FitHub.apk`.

If the workflow starts automatically after the source push, use that run instead of starting a duplicate.

## 7. Install the update

1. Keep the existing app installed if you want Android to update it in place.
2. Transfer `FitHub.apk` to the phone.
3. Tap the APK and allow installation from that file manager/browser if Android asks.
4. Choose Update/Install.
5. If Android reports a signature conflict, the old APK was signed with a different key. Back up anything not synced, uninstall the old APK, then install 1.6.4.

The source folder only exists on the computer/build runner. The phone receives all packaged JavaScript and assets inside the APK and does not need that folder or Metro.

## 8. Test checklist

- Sign in and confirm profile/theme settings still load.
- Home: workout plan, week card, three custom quick-access icons, and friend avatars.
- Train: open every muscle tile, test all equipment filters, add/reorder exercises, start/minimize/recover/finish a workout.
- PR/Clubs (adult test account): complete a qualifying major lift, see PR details, club level-up, only the highest current club, and live member count.
- Food: search, barcode scan, meal selection, remove a mistaken food, copy yesterday, save meal, add/undo water, history and reports.
- Under-18 test account: confirm calorie/macro targets and load-based Clubs remain hidden.
- Supplements: receive reminder, tap Taken, then separately test Reschedule > one hour/two hours; confirm tomorrow's normal schedule is unchanged.
- Friends: like/comment, hide/unhide/delete a comment as post owner, delete own comment, hide totals, delete own workout post.
- Challenges: star difficulty, monthly visibility and completed challenge history.
- Cardio: use Connect Equipment with a Bluetooth FTMS machine; confirm only exposed machine metrics appear and manual fallback remains available.
- Android Back: deeper page returns, non-Home main tab returns Home, Home back exits, and active workout stays recoverable.

## 9. Important troubleshooting

- `Unable to load script` means a debug APK was installed. Use the release artifact from GitHub Actions.
- Hidden dot-files are best uploaded with Git and `git add -A`.
- A red Actions run must be opened at its first real `Error:` line; warnings about deprecated actions are not usually the cause.
- Do not run `npm audit fix --force`; it can introduce breaking dependency changes.
