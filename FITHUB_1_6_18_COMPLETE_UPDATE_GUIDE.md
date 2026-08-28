# FitHub 1.6.18 Complete Step-by-Step Update Guide

Follow every section in order. This ZIP is a complete source snapshot, not a partial patch.

## 1. Back up the current repository

1. Open the FitHub repository on GitHub.
2. Click **Code → Download ZIP**.
3. Keep that backup somewhere safe.
4. Keep the supplied `FitHub_1.6.18_FULL_SOURCE_BACKUP.zip` too.
5. Do not delete the GitHub repository itself. Repository Settings, secrets, variables, Actions history, branches, and permissions are not contained in a source ZIP.

## 2. Extract the update

1. Download `FitHub_1.6.18_COMPLETE_UPDATE.zip`.
2. Right-click it and choose **Extract All**.
3. Open the extracted `FitHub_1.6.18_COMPLETE_UPDATE` folder.
4. Confirm these are directly inside it:

```text
.github
assets
reports
scripts
src
supabase
App.tsx
app.json
index.js
package.json
package-lock.json
```

Do not upload an extra enclosing folder. The repository must not become `FitHub/FitHub/src`.

## 3. Replace the source safely

GitHub Desktop is strongly recommended because `assets/train_v3` contains 472 exercise images.

1. Open the existing FitHub repository in GitHub Desktop.
2. Click **Repository → Show in Explorer**.
3. Keep the hidden `.git` folder. Never delete or replace it.
4. Delete and replace these source folders with the matching folders from the extracted update:

```text
.github
assets
reports
scripts
src
supabase
```

5. Replace the root source/configuration files from the update, including:

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
START_HERE_FITHUB_1_6_18.md
CHANGELOG_1_6_18.md
FITHUB_1_6_18_COMPLETE_UPDATE_GUIDE.md
FITHUB_1_6_18_EMAIL_AND_NOTIFICATION_SETUP.md
FITHUB_1_6_18_VALIDATION_REPORT.md
SOURCE_MANIFEST_SHA256.txt
```

6. Yes, upload `index.js`; `package.json` points to it.
7. Replacing the `supabase` source folder is safe, but it does not change the live database by itself. Section 6 applies the one new SQL file.
8. Do not upload `.env`, `node_modules`, `.expo`, generated `android`/`ios`, APK/AAB files, a keystore, a Firebase service-account JSON, or a real `google-services.json`.

### Exact exercise paths

```text
assets/train_v3/male/...
assets/train_v3/female/...
```

Do not create `assets/train_v3/train_v3`, `assets/train_v3/male/male`, or loose exercise PNGs on the repository main page.

## 4. Commit and push

### GitHub Desktop

1. Review the changed-file list.
2. Enter:

```text
FitHub 1.6.18 complete update
```

3. Click **Commit to main**.
4. Click **Push origin**.

### GitHub browser editor opened with `.`

1. Click the **Source Control** icon on the left—the branch icon with a changed-file number.
2. Review the list and make sure normal root files were not accidentally deleted.
3. Enter `FitHub 1.6.18 complete update` in the message box.
4. Click **Commit**.
5. Choose **Commit directly to main** if prompted.
6. Click **Sync Changes** or **Push** if shown.
7. Return to the normal GitHub repository page and refresh it.

If the web editor cannot upload the full assets folder, stop and use GitHub Desktop. Do not leave `main` with missing assets.

## 5. Confirm the GitHub structure

Check these exact paths:

```text
index.js
assets/train_v3/male/t_bar_row_v2.png
assets/train_v3/female/t_bar_row_v2.png
assets/train_v3/male/decline_sit_up_v2.png
assets/train_v3/female/decline_sit_up_v2.png
assets/train_v3/male/dumbbell_lateral_raise_v2.png
assets/train_v3/female/dumbbell_lateral_raise_v2.png
src/lib/profileAge.ts
src/screens/NotificationsScreen.tsx
src/screens/ResetPasswordScreen.tsx
supabase/UPDATE_2026_08_25_FITHUB_1_6_18_ADDITIVE.sql
.github/workflows/build-apk.yml
```

Confirm `app.json` says `1.6.18`, Android `versionCode` is `28`, and the Expo project ID is `3d3a3683-79bb-4711-ae01-1dab82cc21e7`.

## 6. Run the new Supabase SQL once

1. Open the FitHub project in Supabase.
2. Click **SQL Editor**.
3. Click **New query**.
4. On the computer, open:

```text
supabase/UPDATE_2026_08_25_FITHUB_1_6_18_ADDITIVE.sql
```

5. Select and copy every SQL line inside the file.
6. Paste those SQL contents into the Supabase editor.
7. Do not paste only `supabase/UPDATE_...sql`; that is a filename, not SQL.
8. Click **Run** once.
9. Confirm there is no red error.

This migration is additive. It adds birthdays/automatic age, the private notification inbox, row-level security, invite/request inbox triggers, retry fields, pending-item backfill, and Realtime publication.

If 1.6.17 is already installed, run only the 1.6.18 file. If 1.6.17 was skipped, install its additive migration first. Do not rerun `schema.sql` or every older migration.

## 7. Finish confirmation and reset email setup

Follow `FITHUB_1_6_18_EMAIL_AND_NOTIFICATION_SETUP.md`, Part A.

The required summary is:

1. Add `fithub://auth-confirmed` and `fithub://reset-password` to Supabase Authentication redirect URLs.
2. Enable **Confirm email** in the Email provider.
3. Configure Supabase **Custom SMTP**. Without it, the built-in test sender normally will not deliver to ordinary users.
4. Install `supabase/confirmation-email.html` as the Confirm signup template.
5. Install `supabase/password-recovery-email.html` as the Reset password/Recovery template.
6. Keep `{{ .ConfirmationURL }}` in both templates.

No SMTP password belongs in GitHub or the APK.

## 8. Finish Expo/Firebase push setup

Follow `FITHUB_1_6_18_EMAIL_AND_NOTIFICATION_SETUP.md`, Part B.

Confirm:

- Expo project ID variable is `3d3a3683-79bb-4711-ae01-1dab82cc21e7`.
- Expo Credentials shows an FCM V1 service-account key for Android package `com.fithub.app`.
- The private FCM service-account JSON remains outside GitHub.
- Firebase's `google-services.json` was downloaded for the same Android package.
- The Base64 form of `google-services.json` is saved as GitHub secret `GOOGLE_SERVICES_JSON_BASE64`.

## 9. Deploy the updated notification function

The 1.6.18 worker must replace the older deployment.

From the extracted project folder:

```text
npx supabase login
npx supabase secrets set FRIEND_NOTIFICATION_CRON_SECRET=YOUR_LONG_RANDOM_VALUE --project-ref YOUR_PROJECT_REF
npx supabase functions deploy friend-notifications --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

Then create or update one once-per-minute cron request using the same `x-cron-secret`. Exact instructions are in the email/notification setup guide.

Never share a Supabase access token, service-role key, cron secret, SMTP password, or Firebase service-account JSON in chat.

## 10. Confirm GitHub Actions values

Open **Repository → Settings → Secrets and variables → Actions**.

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

Its value is:

```text
3d3a3683-79bb-4711-ae01-1dab82cc21e7
```

Optional variable:

```text
EXPO_PUBLIC_FITHUB_DOWNLOAD_URL
```

## 11. Do you need normal Command Prompt commands?

No local command is needed merely to upload the source or build through GitHub Actions.

Commands are needed only when deploying the updated Supabase Edge Function in Section 9. Optional local app validation requires Node.js and dependencies:

```text
npm ci
npm run typecheck
npm run audit:exercise-visuals
```

Do not upload `node_modules` afterward.

## 12. Build the APK

1. Open the GitHub FitHub repository.
2. Click **Actions**.
3. Select **Build FitHub APK**.
4. Click **Run workflow**.
5. Select `main` and run it.
6. Wait for every step to turn green:

```text
Check required app secrets
Restore Android push configuration
Install dependencies
Type-check application
Audit every exercise visual
Generate Android project
Verify Android autolinking
Build standalone release APK
Upload FitHub APK
```

7. Open the successful run.
8. Scroll to **Artifacts**.
9. Download `FitHub-1.6.18-APK`.
10. Extract it to get `FitHub.apk`.

Never use the APK from a workflow with a red failed step.

## 13. Install on Android

1. Transfer `FitHub.apk` to the Android phone.
2. Install it.
3. If Android reports a signing conflict, first confirm important account data has synchronized. Then uninstall the previous test APK and install 1.6.18.
4. Open FitHub and allow notifications.

Install 1.6.18 before testing confirmation/reset links so Android recognizes the `fithub://` scheme.

## 14. Test Home and calendars

1. Pull down on Home and confirm the weekly data refreshes.
2. Switch through every light and dark theme.
3. Confirm Home colors, surfaces, geometry, icons, and navigation follow the selected theme.
4. Confirm Today's Plan changes with the scheduled split day.
5. Confirm Rest Day shows the recovery-specific layout/artwork.
6. Tap the **Your Week** card and confirm the monthly workout calendar opens.
7. Select a past date and add a forgotten completed workout.
8. Edit and delete that manual entry.
9. Confirm a future date cannot be marked completed.
10. Confirm each quick-access card opens the correct page.
11. Confirm the bell opens Notifications, has no badge at zero, and shows the unread count when needed.

## 15. Test Train and all exercise presentation

1. Open male Train artwork and then female Train artwork.
2. In light themes, confirm figures/equipment have no separate grey/off-white image rectangle.
3. In dark themes, confirm each exercise image uses a clean white rounded stage.
4. Check the muscle-group grid, exercise list, workout preview, detail page, live workout, guide, picker, and shared plan.
5. Confirm muscle targets stay red in all themes.
6. Open male and female T-Bar Row and confirm an anchored landmine/T-bar setup is shown.
7. Open male and female Decline Sit-Up and confirm a proper decline bench is shown.
8. Open male and female Dumbbell Lateral Raise and confirm a dumbbell appears in each hand.
9. Create a workout and test both **Preview Workout** and **Start Now**.
10. Reorder exercises in Preview and confirm Android Back works.

## 16. Test birthday and under-18 safety

1. Create a test profile using a birthday at least 13 years ago.
2. Confirm onboarding asks for the birthday rather than a typed age.
3. Confirm Profile shows the birthday and calculated age.
4. Confirm changing the birthday recalculates age.
5. For an under-18 test profile, confirm adult calorie/macro/activity-energy targets are hidden and wellbeing-focused goals are shown.
6. Confirm the database rejects a future birthday or an account age below 13.

## 17. Test signup and password reset

1. Sign out.
2. Create an account with a new email address.
3. Confirm the app shows the confirmation screen.
4. Open the newest confirmation email on that phone.
5. Tap **Confirm my FitHub account** and confirm the app opens.
6. Sign out and tap **Forgot password?**.
7. Request the reset, open the newest email, and set a new password in the app.
8. Confirm the new password signs in.
9. Try creating an account again with the same email. Confirm no second Supabase login is created and use sign-in/reset instead.

If ordinary user addresses receive no mail, Custom SMTP is not fully configured. Do not repeatedly press Resend because provider rate limits can delay testing.

## 18. Test notifications and shared gym sessions

Use two physical Android devices/accounts.

1. Pull down on Friends and confirm it refreshes.
2. User A sends User B a future gym invite.
3. Confirm User B receives the Android notification and in-app notification.
4. Test Accept and Decline.
5. Confirm tapping/acting removes the item from the unread notification list and dismisses the system notification.
6. Accept a second invite and open Shared Gym Sessions.
7. Choose **Use the same synced workout** on both phones.
8. Have the leader add, remove, and reorder exercises; confirm the other device updates.
9. Confirm personal weights, reps, completions, and histories remain private to each user.
10. Repeat with **Build my own workout** and confirm both users can create independent workouts.

## 19. Test posts and supplement history

1. Create a private test workout post.
2. Edit its caption.
3. Replace its image, then test removing the image.
4. Confirm users cannot edit someone else's post.
5. Open the supplement calendar.
6. Select a past day and record Taken, Missed, or Skipped as a history correction.
7. Edit that correction and confirm the calendar/agenda refreshes.
8. For an under-18 test profile, confirm the app shows the existing guardian/clinician safety notice and does not provide supplement-use advice.

## 20. Troubleshooting order

### Email fails

1. Confirm Custom SMTP is enabled and its sender is verified.
2. Confirm **Confirm email** is on.
3. Confirm both redirect URLs are allowed.
4. Confirm templates still contain `{{ .ConfirmationURL }}`.
5. Use the newest email and test on the phone with 1.6.18 installed.
6. Disable SMTP click tracking/link rewriting.

### Push fails

1. Confirm Android notification permission is allowed.
2. Confirm the Expo project ID variable.
3. Confirm the FCM V1 key and `google-services.json` come from the same Firebase project/package.
4. Confirm `GOOGLE_SERVICES_JSON_BASE64` exists in GitHub.
5. Confirm the updated Edge Function is deployed and the cron secret matches.
6. Check Supabase Edge Function logs and outbox `last_error` values.
7. Sign out/in to register a fresh token if the old one was `DeviceNotRegistered`.

### Build fails

1. Open the failed GitHub Actions step.
2. Copy the first real error—not only the final Gradle stack trace.
3. Do not delete source files to work around a failed build.
