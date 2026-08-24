# FitHub 1.6.16 Complete Step-by-Step Update Guide

This release is a complete project snapshot. The safest method is GitHub Desktop because hundreds of image replacements and deletions are difficult to manage reliably in GitHub's normal upload page.

## 1. Back up first

1. Download the current GitHub repository as a ZIP.
2. Keep the supplied `FitHub_1.6.16_FULL_SOURCE_BACKUP.zip` in a separate folder.
3. If the app contains important test data, confirm it is already synchronized to Supabase.

## 2. Do not delete the repository

Do not delete everything in GitHub and do not delete the repository itself. Repository Settings, Actions history, secrets, variables, branches, and permissions are not stored in the source ZIP.

It is fine to replace complete source folders such as `assets`, `src`, `scripts`, and `supabase` with the matching folders from this complete update. Keep `.git` when working from a cloned repository.

## 3. Replace the source with GitHub Desktop

1. Extract `FitHub_1.6.16_COMPLETE_UPDATE.zip`.
2. Open GitHub Desktop and clone/open the existing FitHub repository.
3. In File Explorer, open the local repository folder.
4. Replace these folders with the versions from the extracted update:

```text
.github
assets
reports
scripts
src
supabase
```

5. Replace these root files:

```text
.env.example
.gitignore
App.tsx
app.json
eas.json
index.js
package.json
package-lock.json
README.md
tsconfig.json
START_HERE_FITHUB_1_6_16.md
CHANGELOG_1_6_16.md
FITHUB_1_6_16_COMPLETE_UPDATE_GUIDE.md
FITHUB_1_6_16_VALIDATION_REPORT.md
```

6. Yes, `index.js` must be uploaded. `package.json` contains `"main": "index.js"`.
7. Do not copy `node_modules`, `.env`, `.expo`, `android`, `ios`, `dist*`, APK/AAB files, or a real `google-services.json`.
8. In GitHub Desktop, review the changed files.
9. Use the commit message `FitHub 1.6.16 complete update`.
10. Click **Commit to main**, then **Push origin**.

## 4. If you use the `.` GitHub editor

1. Press `.` on the repository page.
2. Delete/replace only project files and folders. Do not touch repository Settings or secrets.
3. Click the **Source Control** icon on the left.
4. Review the changes.
5. Enter `FitHub 1.6.16 complete update`.
6. Click **Commit**.
7. If the editor shows **Sync Changes** or **Push**, click it so the commit reaches GitHub.

The browser editor can struggle with 472 exercise images. GitHub Desktop remains the recommended route.

## 5. Confirm the repository structure

The important paths are:

```text
assets/train_v3/male/...
assets/train_v3/female/...
assets/train_v4/groups/male/...
assets/train_v4/groups/female/...
src/...
supabase/UPDATE_2026_08_24_FITHUB_1_6_16_ADDITIVE.sql
supabase/functions/friend-notifications/index.ts
.github/workflows/build-apk.yml
index.js
```

There must not be nested paths such as `assets/assets`, `src/src`, or `train_v3/train_v3`.

## 6. Run the new Supabase migration once

1. Open Supabase Dashboard.
2. Select the FitHub project.
3. Open **SQL Editor**.
4. Create a new query.
5. Copy the complete contents of:

```text
supabase/UPDATE_2026_08_24_FITHUB_1_6_16_ADDITIVE.sql
```

6. Click **Run** once.
7. Confirm the query completes without an error.

Do not rerun `schema.sql` and do not rerun every older migration. The 1.6.16 file is additive and preserves existing data.

## 7. Deploy the updated notification worker

If the Supabase CLI is already linked to this project, open Command Prompt in the FitHub folder and run:

```text
supabase functions deploy friend-notifications --no-verify-jwt
```

If it is not linked yet:

```text
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set FRIEND_NOTIFICATION_CRON_SECRET=YOUR_LONG_RANDOM_VALUE
supabase functions deploy friend-notifications --no-verify-jwt
```

Keep `FRIEND_NOTIFICATION_CRON_SECRET` private. Never put it in the APK, `.env.example`, or GitHub source.

In Supabase Dashboard, open **Integrations → Cron** and create or edit one job:

- Name: `fithub-notification-outbox`
- Schedule: `* * * * *`
- Request: HTTP POST
- URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/friend-notifications`
- Header: `Content-Type: application/json`
- Header: `x-cron-secret: YOUR_LONG_RANDOM_VALUE`
- Body: `{}`

If a previous FitHub friend-notification job already exists, edit it instead of creating a duplicate.

## 8. Configure the Expo project ID

Remote gym invites need an Expo project ID. This is a public UUID, not a service-role secret.

1. Open the FitHub project on Expo's dashboard and copy its **Project ID**.
2. If the app has never been linked to Expo, open Command Prompt in the FitHub folder and run:

```text
npx eas-cli@latest init
```

3. In GitHub, open **Settings → Secrets and variables → Actions → Variables**.
4. Create:

```text
EXPO_PUBLIC_EXPO_PROJECT_ID
```

5. Paste the Expo project UUID as the value.

## 9. Configure Android Firebase push delivery

1. Open Firebase Console and select/create the project used for FitHub notifications.
2. Add an Android app with this exact package name:

```text
com.fithub.app
```

3. Download `google-services.json`.
4. Do not upload that file to the public repository.
5. In Windows PowerShell, from the folder containing it, copy a Base64 form to the clipboard:

```text
[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json")) | Set-Clipboard
```

6. In GitHub, open **Settings → Secrets and variables → Actions → Secrets**.
7. Create this repository secret and paste the clipboard value:

```text
GOOGLE_SERVICES_JSON_BASE64
```

8. Configure the Android FCM V1 service account for the same Expo project using Expo's credentials setup. From the FitHub folder you can run:

```text
npx eas-cli@latest credentials -p android
```

Choose the Android push-notification/FCM V1 service-account option and use the service-account JSON belonging to the same Firebase project. Keep that service-account file private and never commit it.

The APK workflow restores `google-services.json` only inside the protected build runner and does not upload it as an artifact.

## 10. Confirm all GitHub Actions values

Repository secrets:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
GOOGLE_SERVICES_JSON_BASE64
```

Repository variable:

```text
EXPO_PUBLIC_EXPO_PROJECT_ID
```

Optional repository variable:

```text
EXPO_PUBLIC_FITHUB_DOWNLOAD_URL
```

Use only the Supabase publishable/anon key in the mobile build. Never use the service-role key.

## 11. Do you need to run npm commands locally?

No npm command is required merely to upload the complete ZIP through GitHub. If you want to validate a local copy, open Command Prompt in the FitHub folder and run:

```text
npm ci
npm run typecheck
npm run audit:exercise-visuals
```

Do not upload the resulting `node_modules` folder.

## 12. Build the APK

1. Open GitHub **Actions**.
2. Select **Build FitHub APK**.
3. Click **Run workflow**.
4. Choose `main` and run it.
5. Confirm these steps turn green:

```text
Check required app secrets
Restore Android push configuration
Install dependencies
Type-check application
Audit every exercise visual
Generate Android project
Build standalone release APK
Upload FitHub APK
```

6. Open the successful run.
7. Download the artifact named `FitHub-1.6.16-APK`.
8. Extract it to obtain `FitHub.apk`.

## 13. Install safely

1. Transfer `FitHub.apk` to the Android phone.
2. Install it.
3. If Android reports a signing conflict, first confirm that account data is synchronized, then uninstall the older testing APK and install 1.6.16.
4. Sign in and grant notification permission when asked.

## 14. Test the release

### Home and themes

1. Switch through every theme in light and dark mode.
2. Confirm the Home layout follows the new hero, Your Week, Quick Access, and Friend Feed structure.
3. Change today's split between a workout day and Rest Day.
4. Confirm the title, button, details, and artwork update.
5. Log a workout and confirm Your Week and both progress rings refresh.

### Train and images

1. Open Train in light mode and confirm the figures/equipment have transparent surroundings.
2. Open Train in dark mode and confirm selection rows use a clean white image stage inside the dark card.
3. Check male and female paths.
4. Open T-Bar Row and confirm it shows the anchored landmine/T-bar setup.
5. Check several equipment-heavy exercises for white fragments between the person and equipment.
6. Pull down to refresh the Train pages.

### Manual workout history

1. Open Journey/Workout History.
2. Tap a past date.
3. Add a completed workout with a title and duration.
4. Confirm the calendar, list, weekly totals, and streak update.
5. Edit the manual entry, then test deleting it.
6. Confirm a future date cannot be edited and a live workout cannot be overwritten by the manual editor.

### Supplement calendar

1. Open Supplements.
2. Select a past date.
3. Mark one reminder Taken and give it a time.
4. Mark another Missed or Skipped.
5. Edit and clear a status.
6. Confirm future dates cannot be manually changed.

### Posts and refresh

1. Open Friends and find one of your own workout posts.
2. Edit its caption.
3. Replace the image, save, and reopen it.
4. Remove the image and save again.
5. Confirm another user's post has no edit control.
6. Pull down on Home, Friends, Food, You, history, progress, supplements, and Train screens.

### Gym-invite notifications

Use two physical devices and two FitHub accounts that are already friends.

1. Install 1.6.16 on both devices and allow notifications.
2. Send a gym invite from device A to device B.
3. Wait up to the one-minute cron interval.
4. Confirm device B shows Accept and Decline in the system notification.
5. Accept one invite directly from the notification and confirm the notification disappears.
6. Send another invite, decline it, and confirm it disappears.
7. Tap a normal FitHub notification and confirm the selected notification is removed from the notification tray.
8. Use `TAKEN` on a supplement notification and confirm the calendar entry is saved and the notification disappears.

If remote invites do not arrive, check the Supabase function logs, Cron run history, Expo project ID, Firebase package name, FCM V1 credentials, device notification permission, and the `push_tokens` row for the receiving account.
