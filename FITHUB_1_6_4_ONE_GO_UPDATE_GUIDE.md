# FitHub 1.6.4 one-go update guide

This package is the full FitHub source update, not only a backup. It keeps Android package `com.fithub.app`, so the APK can install over the existing FitHub app. Version is 1.6.4 and Android versionCode is 14.

## 1. Back up first

1. Download the current GitHub repository as a ZIP.
2. In Supabase, open Database > Backups and confirm a recent backup exists.
3. Do not rerun old migrations that your project already has.

## 2. Upload this source to GitHub

The safest method is Git from Command Prompt because GitHub's browser uploader can hide dot-folders.

1. Extract the FitHub 1.6.4 ZIP.
2. Open the extracted `FitHub` folder.
3. Click the File Explorer address bar, type `cmd`, and press Enter.
4. Run these commands one at a time, replacing the repository URL:

```bat
git init
git branch -M main
git remote remove origin
git remote add origin https://github.com/YOUR-NAME/YOUR-FITHUB-REPOSITORY.git
git add -A
git status
git commit -m "FitHub 1.6.4 complete update"
git push -u origin main --force-with-lease
```

If `git remote remove origin` says no such remote, continue. `git add -A` includes `.github`, `.gitignore`, and `.env.example`. Never upload a real `.env` or any FatSecret secret.

If you prefer the GitHub website, upload every visible file and folder, including `assets`, `src`, `supabase`, and the root files. Then create these hidden files using Add file > Create new file:

- `.github/workflows/build-apk.yml`
- `.gitignore`
- `.env.example`

Do not upload `node_modules`, `.expo`, `android`, a real `.env`, APK files, or personal secret values.

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
