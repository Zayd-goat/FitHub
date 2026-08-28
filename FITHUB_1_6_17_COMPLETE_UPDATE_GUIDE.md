# FitHub 1.6.17 Complete Step-by-Step Update Guide

This is the complete source update. Follow the steps in order.

## 1. Back up the current repository

1. Open the FitHub repository on GitHub.
2. Click **Code → Download ZIP** and keep that backup somewhere safe.
3. Keep the supplied `FitHub_1.6.17_FULL_SOURCE_BACKUP.zip` too.
4. Do not delete the GitHub repository itself. Its Settings, Actions history, secrets, variables, permissions, and branches are not stored in the source ZIP.

## 2. Extract the complete update

1. Download `FitHub_1.6.17_COMPLETE_UPDATE.zip`.
2. Right-click it and choose **Extract All**.
3. Open the extracted `FitHub_1.6.17_COMPLETE_UPDATE` folder.
4. Confirm that `App.tsx`, `index.js`, `package.json`, `assets`, `src`, and `supabase` are directly inside it.

Do not upload the enclosing download folder and do not create paths such as `FitHub/FitHub/src`.

## 3. Replace the existing source

GitHub Desktop is recommended because the project contains hundreds of images.

1. Open the existing FitHub repository in GitHub Desktop.
2. Click **Repository → Show in Explorer**.
3. Keep the local `.git` folder. Do not delete it.
4. Replace these project folders with the matching folders from 1.6.17:

```text
.github
assets
reports
scripts
src
supabase
```

5. Replace the root project files, including:

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
START_HERE_FITHUB_1_6_17.md
CHANGELOG_1_6_17.md
FITHUB_1_6_17_COMPLETE_UPDATE_GUIDE.md
FITHUB_1_6_17_VALIDATION_REPORT.md
SOURCE_MANIFEST_SHA256.txt
```

6. Yes, upload `index.js`. `package.json` points to it as the app entry file.
7. It is fine to delete the old `src`, `assets`, `scripts`, `reports`, or `supabase` folders before copying their complete replacements from this ZIP.
8. Do not delete or upload `.git`.
9. Do not upload `.env`, `node_modules`, `.expo`, generated `android`/`ios`, APK/AAB files, a keystore, a Firebase service-account JSON, or a real `google-services.json`.

## 4. Commit and push the source

### GitHub Desktop

1. Review the changed-file list.
2. Enter this commit message:

```text
FitHub 1.6.17 complete update
```

3. Click **Commit to main**.
4. Click **Push origin**.

### If you opened the repository by pressing `.` on GitHub

1. Click the **Source Control** icon on the left (the branch icon with a number beside it).
2. Review the changed files.
3. Enter `FitHub 1.6.17 complete update` in the message box.
4. Click **Commit**.
5. If prompted, choose **Commit directly to main**.
6. Click **Sync Changes** or **Push** if that button appears.
7. Return to the normal GitHub repository page and refresh it to confirm the commit is visible.

The browser editor can struggle with the large `assets` folder. If it fails, use GitHub Desktop.

## 5. Confirm the uploaded structure

Check these exact paths on GitHub:

```text
index.js
assets/train_v3/male/...
assets/train_v3/female/...
assets/train_v4/groups/male/...
assets/train_v4/groups/female/...
src/lib/authLinks.ts
src/lib/sharedGym.ts
src/screens/ResetPasswordScreen.tsx
supabase/confirmation-email.html
supabase/password-recovery-email.html
supabase/UPDATE_2026_08_25_FITHUB_1_6_17_ADDITIVE.sql
.github/workflows/build-apk.yml
```

Confirm `app.json` says version `1.6.17` and Android `versionCode` is `27`.

## 6. Run the new Supabase migration once

1. Open Supabase Dashboard and choose the FitHub project.
2. Click **SQL Editor**.
3. Click **New query**.
4. On your computer, open:

```text
supabase/UPDATE_2026_08_25_FITHUB_1_6_17_ADDITIVE.sql
```

5. Select and copy the complete SQL contents inside that file.
6. Paste the SQL contents into the Supabase query editor.
7. Do not paste only the filename or a path such as `supabase/UPDATE...sql`.
8. Click **Run** once.
9. Confirm it finishes without an error.

Do not rerun `schema.sql`. If 1.6.16 was already installed, do not rerun its migration. If 1.6.16 was never installed, run `UPDATE_2026_08_24_FITHUB_1_6_16_ADDITIVE.sql` first, then run the 1.6.17 file.

## 7. Add the two mobile authentication redirect URLs

1. In Supabase, open **Authentication**.
2. Open **URL Configuration**.
3. Find **Redirect URLs** or **Redirect URLs allow list**.
4. Click **Add URL**.
5. Add this exact value:

```text
fithub://auth-confirmed
```

6. Click **Add URL** again.
7. Add this exact value:

```text
fithub://reset-password
```

8. Save the URL configuration.

Do not replace your existing Site URL. These are additional mobile redirect URLs.

## 8. Turn on signup confirmation email

1. In Supabase, open **Authentication → Providers**.
2. Open **Email**.
3. Keep Email provider enabled.
4. Turn on **Confirm email**.
5. Save.

With confirmation enabled, a new account receives a confirmation email and cannot complete normal sign-in until its email is confirmed.

## 9. Install the FitHub confirmation template

1. Open **Authentication → Email Templates**.
2. Select **Confirm signup**.
3. Use this subject:

```text
Confirm your FitHub account
```

4. Open `supabase/confirmation-email.html` from the extracted update.
5. Copy the complete HTML contents.
6. Replace the template body in Supabase with those contents.
7. Save.

The template already contains Supabase's `{{ .ConfirmationURL }}` placeholder. Do not replace that placeholder with a normal web address.

## 10. Install the FitHub password-recovery template

1. Stay in **Authentication → Email Templates**.
2. Select **Reset password** or **Recovery**.
3. Use this subject:

```text
Reset your FitHub password
```

4. Open `supabase/password-recovery-email.html` from the extracted update.
5. Copy the complete HTML contents.
6. Replace the recovery template body in Supabase with those contents.
7. Save.

The app sends reset requests to `fithub://reset-password`, opens the link in FitHub, and then asks for the new password twice.

## 11. Check email delivery settings

Supabase's built-in test mail service can be limited. For real users, configure a trusted SMTP provider in **Authentication → SMTP Settings** and verify the sender address. This does not require putting an SMTP password in the APK or GitHub source.

No new GitHub Actions secret is required for confirmation or reset email. The email is sent by Supabase Auth.

## 12. Keep the existing push setup

The existing 1.6.16 notification setup remains required for remote gym-invite pushes. Confirm these GitHub Actions values still exist.

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

Optional variable:

```text
EXPO_PUBLIC_FITHUB_DOWNLOAD_URL
```

Never use the Supabase service-role key in the mobile app. Do not expose a Firebase service-account JSON or Android keystore.

If the 1.6.16 `friend-notifications` Edge Function and cron job are already deployed, do not create duplicates. No new Edge Function deployment is required solely for 1.6.17.

## 13. Do you need Command Prompt commands?

No command is required just to replace the source and build it through GitHub Actions.

Optional local validation, only if Node.js is installed:

```text
npm ci
npm run typecheck
npm run audit:exercise-visuals
```

Do not upload `node_modules` afterward.

## 14. Build the APK

1. Open the GitHub FitHub repository.
2. Click **Actions**.
3. Select **Build FitHub APK**.
4. Click **Run workflow**.
5. Choose `main` and start it.
6. Wait for every step to turn green, especially:

```text
Install dependencies
Type-check application
Audit every exercise visual
Generate Android project
Build standalone release APK
Upload FitHub APK
```

7. Open the successful run.
8. Scroll to **Artifacts**.
9. Download `FitHub-1.6.17-APK`.
10. Extract the artifact to obtain `FitHub.apk`.

Do not install an APK from a run with a red failed step.

## 15. Install the APK

1. Transfer `FitHub.apk` to the Android phone.
2. Install it.
3. If Android reports a signing conflict, first confirm important account data is synchronized, then uninstall the older test APK and install 1.6.17.
4. Sign in and allow notifications when requested.

Install 1.6.17 before testing its confirmation or reset links so Android knows that the `fithub://` scheme belongs to FitHub.

## 16. Test signup confirmation

1. Sign out of FitHub.
2. Choose **Create an account**.
3. Use an email that is not already registered.
4. Confirm FitHub shows the confirmation screen.
5. Open the newest confirmation email on that Android phone.
6. Tap **Confirm my FitHub account**.
7. Confirm FitHub opens and reports that the email is confirmed.
8. Test **Resend confirmation email** once and always use the newest email.

## 17. Test Forgot Password

1. Sign out.
2. Tap **Forgot password?** on the sign-in card.
3. Enter the account email.
4. Tap **Email reset instructions**.
5. Open the newest reset email on the phone.
6. Tap **Reset my FitHub password**.
7. Confirm FitHub opens the **Choose a new password** screen.
8. Enter the same new password twice and save it.
9. Sign out and confirm the new password works.

For privacy, the reset request shows the same response even if no account exists for the entered email.

## 18. Test shared gym workouts with two accounts

1. Sign in as User A on one phone and User B on another.
2. From Friends, User A sends User B a gym invite.
3. Confirm User B receives the invite notification and can Accept or Decline.
4. Accept it and open **Shared gym sessions**.
5. User A adds exercises, sets, and planned reps, then starts the session.
6. On each phone choose one option:
   - **Use the same synced workout**
   - **Build my own workout**
7. In synced mode, have the leader add, remove, or reorder an exercise. Confirm the second phone updates.
8. Confirm each user can record different weights, reps, completed sets, and cardio results.
9. Finish both workouts and confirm each account receives only its own private workout history.
10. Transfer leader control to the other accepted user and confirm only the new leader can change the shared plan.
11. Test the optional joint post and confirm it cannot publish until every included participant consents.

## 19. Test Home, history, Train, and themes

1. Tap the **Your Week** card and confirm it opens the monthly workout calendar.
2. Select a past date and manually add a forgotten completed workout.
3. Confirm future dates are blocked and manual entries can be edited or deleted.
4. Test Rest Day and workout-day Home heroes.
5. Switch through every light and dark theme.
6. In light themes, confirm exercise figures/equipment have transparent surroundings.
7. In dark themes, confirm exercise list, preview, detail, active-workout, guide, and shared-plan images sit on clean white rounded stages.
8. Test male and female image paths.
9. Open T-Bar Row and confirm the anchored landmine/T-bar equipment is shown.
10. Pull down to refresh the main scrollable pages.

## 20. If an email link does not open FitHub

Check these items in order:

1. Version 1.6.17 is installed on the phone.
2. Both exact redirect URLs are saved in Supabase.
3. The email template still uses `{{ .ConfirmationURL }}`.
4. You opened the newest email; older links may have expired or been replaced.
5. The email was opened on the phone where FitHub is installed.
6. Email tracking/link rewriting is disabled in the SMTP provider.

If needed, request a new confirmation or reset email from the app and test the newest link.
