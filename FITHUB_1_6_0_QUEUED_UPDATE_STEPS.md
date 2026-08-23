# FitHub 1.6.0 queued update — one-go instructions

## 1. Replace the GitHub project source

Open the `FitHub` folder from this ZIP. Upload its contents to the root of the existing GitHub repository, preserving the folder structure. Replace files when GitHub asks. Never upload `node_modules`, a real `.env`, or `supabase/.temp`.

## 2. Run the additive database migration

1. Open Supabase Dashboard → your FitHub project → SQL Editor.
2. Click **New query**.
3. Open `supabase/UPDATE_2026_08_15_FITHUB_1_6_0_QUEUED_ADDITIVE.sql` from this package.
4. Copy the entire file into SQL Editor and click **Run** once.
5. A successful result normally says `Success. No rows returned`.

Do not rerun `schema.sql` or the 1.5.0 baseline migration. This update is additive.

## 3. Deploy both Edge Functions

Open Command Prompt inside the FitHub project folder and run:

```bat
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy nutrition-proxy
npx supabase functions deploy friend-notifications --no-verify-jwt
```

Create a long random cron secret, keep it private, and run:

```bat
npx supabase secrets set FRIEND_NOTIFICATION_CRON_SECRET="YOUR_LONG_RANDOM_SECRET"
```

The `friend-notifications` function processes the private notification outbox. Invoke it on a short server-side schedule with header `x-cron-secret` matching that secret. Do not place this secret in the Android app. Until that schedule is enabled, preferences and queued alerts work, but remote friend push delivery waits in the outbox.

## 4. Verify FatSecret secrets remain installed

```bat
npx supabase secrets list
```

The list should contain `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET`, and `FATSECRET_SCOPES`. Never put their values in GitHub or Android source.

## 5. Build the APK in GitHub

1. Open the repository on GitHub.
2. Open **Actions**.
3. Select the FitHub Android APK workflow.
4. Click **Run workflow** → **Run workflow**.
5. Wait for the green checkmark.
6. Open the completed run and download the APK from **Artifacts**.
7. Extract the downloaded artifact ZIP to obtain the `.apk`.

## 6. Install on the phone

1. Transfer only the `.apk` to the Android phone.
2. Open it and allow **Install unknown apps** for the browser/file manager if requested.
3. Install over the existing FitHub app. Android versionCode 10 permits the upgrade while preserving app data when the package name and signing key match.
4. If Android reports a signature conflict, do not uninstall immediately if local-only data matters; build with the same signing key used previously.

## 7. Test checklist

- Complete a workout, open it from Home, and check its sets in Workout History.
- Confirm the workout date is highlighted in the history calendar.
- Log a food, remove it, and confirm totals change.
- Create a supplement reminder; tap **Taken** on its notification and verify the calendar.
- Manually mark/unmark a supplement check-in.
- For an adult test account, cross a major-lift threshold and verify PR then Club unlock messaging.
- Confirm Clubs shows earned clubs only and an active-member count.
- Under Friends → Following, enable Posts and/or PRs for one friend and leave another off.
- Confirm under-18 accounts retain FitHub’s age-appropriate nutrition and Clubs behavior.
