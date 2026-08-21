# FitHub 1.6.8 one-go update guide

This guide starts after you have downloaded and extracted the FitHub 1.6.8 ZIP. The extracted folder itself is the project root; there is no extra `FitHub` folder inside it.

## 1. Make a safe copy

Keep the supplied full-source backup ZIP unchanged. Do not overwrite your current working app until the new APK has passed the checklist at the end of this guide.

## 2. Upload the project to GitHub manually

1. Open your FitHub repository on GitHub.
2. On the `main` branch, choose **Add file > Upload files**.
3. Upload every visible root file and folder from the extracted project. Upload folders such as `assets`, `src`, `scripts`, and `supabase` with their contents.
4. GitHub's browser uploader may hide dot-files. Create these manually with **Add file > Create new file**:
   - `.gitignore`
   - `.env.example`
   - `.github/workflows/build-apk.yml`
5. For the workflow, type `.github/workflows/build-apk.yml` in the filename box; GitHub creates both hidden folders automatically.
6. Do **not** upload `.env`, Supabase service-role keys, FatSecret secrets, `node_modules`, `.expo`, Android build output, or an APK signing keystore.
7. Commit the upload directly to `main`, or use a branch and merge it after review.

## 3. Confirm the existing database baseline

Your current baseline is the migration you already ran: `supabase/UPDATE_2026_08_14_FITHUB_1_5_0.sql`. Do not run that file again.

In Supabase Dashboard open **SQL Editor**, run:

```sql
select
  to_regclass('public.water_logs') as nutrition_1_6_0,
  to_regclass('public.supplement_checkins') as queued_update,
  to_regclass('public.friend_notification_outbox') as friend_notifications,
  to_regclass('public.supplement_reschedules') as update_1_6_1;
```

If each result contains the table name, the later additive migrations have already been applied and must not be duplicated. If a result is `null`, run only the corresponding missing additive SQL file, in date order:

1. `supabase/UPDATE_2026_08_14_FITHUB_1_6_0_ADDITIVE.sql`
2. `supabase/UPDATE_2026_08_15_FITHUB_1_6_0_QUEUED_ADDITIVE.sql`
3. `supabase/UPDATE_2026_08_17_FITHUB_1_6_1_ADDITIVE.sql`
4. `supabase/UPDATE_2026_08_19_FITHUB_1_6_4_ADDITIVE.sql`

Open each required file, copy all its SQL into a new SQL Editor query, choose **Run**, and stop if Supabase reports an error. Never run `schema.sql` against an existing production project.

## 4. Configure and deploy Edge Functions

Open Command Prompt in the extracted project folder: click the File Explorer address bar, type `cmd`, and press Enter.

```bat
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REFERENCE
```

The project reference is the Project ID/reference shown in Supabase URLs and API settings.

Set FatSecret secrets with no spaces around `=` and do not paste them into GitHub:

```bat
npx supabase secrets set FATSECRET_CLIENT_ID=YOUR_CLIENT_ID FATSECRET_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

Deploy the included functions:

```bat
npx supabase functions deploy nutrition-proxy
npx supabase functions deploy food-search
npx supabase functions deploy friend-notifications
```

The app never receives the FatSecret client secret. Confirm the FatSecret application is active and its approved scopes match the endpoints enabled for your account. `invalid_client` means the ID/secret pair or provider application configuration is invalid; generate or copy the credentials from the official FatSecret Platform developer portal, then set the Supabase secrets again.

## 5. Friend-notification cron

In Supabase Dashboard open **Integrations > Cron > Jobs**. Keep one active job for `friend-notifications`; do not create duplicates. A `401 Unauthorized` response means the request lacks the expected authorization header or uses the wrong secret. Recreate the job using the SQL/instructions already included with your deployed notification setup, then confirm its latest run succeeds.

## 6. Configure the public app environment

Copy `.env.example` to `.env` on your computer and enter only public client values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REFERENCE.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Never put a service-role key or FatSecret secret in this file.

For GitHub Actions, open **Repository Settings > Secrets and variables > Actions** and add the same two public values as repository secrets if the workflow reads them there.

## 7. Build the APK with GitHub Actions

1. Open the repository's **Actions** tab.
2. Choose **Build FitHub APK**.
3. Select **Run workflow**, branch `main`, then **Run workflow**.
4. Open the run and wait for type-check, Android generation, and `assembleRelease` to finish.
5. Download the `FitHub-APK` artifact from the run summary.
6. Extract the artifact ZIP and transfer the APK to the phone.

If Android reports an AAPT2 PNG error, confirm all `assets/train_v3` files from this release were uploaded completely and that GitHub did not retain an older partial asset folder.

## 8. Install safely

1. Keep the previous APK until testing is complete.
2. On Android, permit installation from the file manager or browser you use to open the APK.
3. Install over the existing app only if the package remains `com.fithub.app` and signing is compatible. Otherwise uninstalling will remove local-only data, so back up/sync first.
4. Open FitHub and sign in with a test account before using the production account.

## 9. Required testing checklist

- Authentication, profile, existing saved workouts, workout editing, PR graphs, invites, feed, challenges, Clubs, themes, hidden features, food history, and immersive fullscreen still work.
- Male and female Train group tiles follow the profile selection; female artwork keeps the chest fully covered.
- Corrected exercises show the named equipment and angle. Entries still awaiting a reviewed exact asset show no misleading movement image.
- Android Back follows deeper page > previous page > non-Home tab to Home > Home exits.
- Start a workout, navigate elsewhere, use the floating workout bar, reorder an exercise, return, and complete it.
- Meal `+` opens food search; select a serving, confirm, log, then delete the mistaken entry.
- Water add/undo works and history persists.
- Adult test account can use permitted nutrition search; teen test account remains protected from calorie targets and provider/barcode lookup.
- Supplement notification offers Taken, 1 hour, and 2 hours; a reschedule affects only that day.
- Friend post and PR notification preferences work per friend.
- Clubs level up from workout history without retaining the obsolete lower club.
- Bluetooth equipment shows only metrics the FTMS machine exposes and manual tracking remains available.

## 10. Local verification commands

From the project root:

```bat
npm install
npm run typecheck
npm run audit:exercise-visuals
npx expo export --platform android
```

The audit report is written to `reports/exercise-visual-audit.json`.

