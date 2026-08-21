# FitHub 1.6.9 — manual GitHub and APK update guide

This guide assumes the extracted folder itself contains `App.tsx`, `package.json`, `src`, `assets`, `supabase`, and `.github`. There is no extra `FitHub` folder inside it.

## 1. Keep a backup

1. Download the current GitHub repository as a ZIP: **Code → Download ZIP**.
2. Keep the current working APK until the new APK has passed the checklist.
3. Do not upload `.env`, FatSecret secrets, Supabase service-role keys, `node_modules`, `android/build`, `dist-audit`, APKs, or AABs.

## 2. Replace the GitHub source manually

The safest manual method is to upload the complete contents of the provided `FitHub` source folder into the root of the GitHub repository.

1. Open the GitHub repository and select the `main` branch.
2. Remove old tracked source files/folders that the replacement package supersedes, but keep repository settings and Actions secrets.
3. Choose **Add file → Upload files**.
4. Drag these visible items from the extracted update into the upload area:
   - `assets`
   - `scripts`
   - `src`
   - `supabase`
   - `App.tsx`
   - `app.json`
   - `eas.json`
   - `package.json`
   - `package-lock.json`
   - `tsconfig.json`
   - all included Markdown guides/changelogs
5. Commit directly to `main` with a message such as `FitHub 1.6.9 complete update`.

Uploading a whole folder is correct. GitHub uploads the files inside it and preserves their relative paths. If GitHub leaves old files that are no longer in the update, delete those old files separately.

## 3. Recreate hidden files in GitHub

The browser file picker may hide names beginning with a dot. Create them directly on GitHub.

### `.gitignore`

1. Choose **Add file → Create new file**.
2. Enter `.gitignore` as the filename.
3. Copy the contents from the update package's `.gitignore`.
4. Commit.

### `.env.example`

Repeat the same process with `.env.example`. This is only a template; never place real secret values in it.

### `.github/workflows/build-apk.yml`

1. Choose **Add file → Create new file**.
2. Enter `.github/workflows/build-apk.yml` in the filename box. GitHub creates both folders automatically.
3. Copy the exact contents of the included workflow file.
4. Commit.

## 4. Check the GitHub repository layout

The root must show this structure:

```text
.github/workflows/build-apk.yml
assets/
scripts/
src/
supabase/
.env.example
.gitignore
App.tsx
app.json
package.json
package-lock.json
tsconfig.json
```

Do not put these inside another `FitHub` subfolder. The workflow expects `package.json` at the repository root.

## 5. Configure GitHub Actions secrets

1. Open **Settings → Secrets and variables → Actions**.
2. Under **Repository secrets**, create or update:
   - `EXPO_PUBLIC_SUPABASE_URL` = the project URL from Supabase **Project Settings → Data API**.
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the Supabase publishable/anon client key.
3. Do not add the FatSecret client secret or Supabase service-role key to public Expo variables.
4. Optional: under **Variables**, set `EXPO_PUBLIC_FITHUB_DOWNLOAD_URL` to your public FitHub download/store page.

## 6. Verify the current Supabase database before applying SQL

In Supabase **SQL Editor**, run:

```sql
select
  to_regclass('public.water_logs') as nutrition,
  to_regclass('public.supplement_checkins') as supplements,
  to_regclass('public.supplement_reschedules') as supplement_reschedules,
  to_regclass('public.friend_notification_outbox') as friend_notifications,
  to_regclass('public.current_club_memberships') as current_clubs,
  to_regclass('public.post_reactions') as post_reactions;
```

If every result contains a table name, do not recreate those tables. If anything is missing, run only the included additive migrations that have not already been applied, in this order:

1. `supabase/UPDATE_2026_08_14_FITHUB_1_6_0_ADDITIVE.sql`
2. `supabase/UPDATE_2026_08_15_FITHUB_1_6_0_QUEUED_ADDITIVE.sql`
3. `supabase/UPDATE_2026_08_17_FITHUB_1_6_1_ADDITIVE.sql`
4. `supabase/UPDATE_2026_08_19_FITHUB_1_6_4_ADDITIVE.sql`

The existing `UPDATE_2026_08_14_FITHUB_1_5_0.sql` remains the baseline. Do not run it again merely for this visual release.

## 7. Configure and deploy the FatSecret proxy

Use the official FatSecret Platform OAuth 2.0 client credentials from your approved FatSecret application. If FatSecret reports `invalid_client`, confirm the client ID/secret pair in the FatSecret developer portal; do not guess or create random values.

From a command prompt opened in the project root:

```bat
npx supabase login --token YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN
npx supabase link --project-ref YOUR_PROJECT_REFERENCE
npx supabase secrets set FATSECRET_CLIENT_ID="YOUR_FATSECRET_CLIENT_ID"
npx supabase secrets set FATSECRET_CLIENT_SECRET="YOUR_FATSECRET_CLIENT_SECRET"
npx supabase secrets set FATSECRET_SCOPES="basic localization barcode"
npx supabase functions deploy nutrition-proxy
```

Use only scopes approved for your FatSecret account. If `localization` or `barcode` is not approved, omit it from `FATSECRET_SCOPES`. The secret values stay server-side in Supabase and are not bundled in the APK.

## 8. Deploy friend notifications

1. Create a long random value and store it as `FRIEND_NOTIFICATION_CRON_SECRET` in Supabase Edge Function secrets.
2. Deploy:

```bat
npx supabase functions deploy friend-notifications --no-verify-jwt
```

3. The scheduled request must be a POST to:

```text
https://YOUR_PROJECT_REFERENCE.supabase.co/functions/v1/friend-notifications
```

4. It must include this header:

```text
x-cron-secret: THE_SAME_RANDOM_VALUE
```

A `401 Unauthorized` means that header is absent or does not exactly match the Edge Function secret. Do not use the FatSecret secret for this job.

## 9. Start the GitHub APK build

1. Open **Actions** in GitHub.
2. Select **Build FitHub APK**.
3. Select **Run workflow → main → Run workflow**.
4. Wait for the `android-apk` job to become green.
5. Open the completed run.
6. Under **Artifacts**, download `FitHub-APK`.
7. Extract the artifact ZIP to obtain `FitHub.apk`.

If a build starts automatically after the upload, it is the same workflow; you may use that run instead.

## 10. Install without losing the current account

1. Keep the existing FitHub APK installed until the new file is ready.
2. Transfer `FitHub.apk` to the Android phone.
3. Open it and allow installation from that file source if Android asks.
4. Install it over the existing app. The package remains `com.fithub.app`, so Android treats it as an update.
5. Do not uninstall the old app first unless Android reports a signing conflict. Uninstalling can remove locally cached data.

## 11. Required test checklist

- Sign in and confirm the existing profile and saved workouts remain available.
- Open Train and confirm the boxed muscle-group grid uses the selected profile presentation.
- Change themes and confirm cards, text, borders, and buttons follow the theme instead of staying black/red.
- Open several exercises from every muscle group and confirm the picture matches the named equipment and movement.
- Confirm female visuals use fully covered, opaque training clothing.
- Start a workout, reorder an exercise, leave Train, use the floating workout bar, resume, and complete it.
- Use Android Back from a detail page, from a non-Home tab, and from Home.
- Open each Food meal section, search, choose a serving, confirm before logging, delete a mistaken entry, and test water.
- Confirm an under-18 test profile receives the private meal/water journal without calorie targets or load-chasing clubs.
- Test supplement Taken, one-hour reschedule, two-hour reschedule, calendar correction, and next-day normal reminder.
- Test friend post/PR notification toggles, post deletion, comment hide/unhide/delete, and count visibility.
- Confirm Clubs shows only the highest current supported club per adult lift and updates its member count.
- Test challenge difficulty stars, creator name, monthly visibility, progress, and completed history.
- Test Bluetooth cardio using supported FTMS equipment and confirm unsupported machines offer manual tracking.

## 12. Build evidence included in this release

- TypeScript check passed.
- Exercise visual audit passed for 230/230 exercises with zero pending reviews.
- Android Expo production bundle passed and included the complete visual asset set.
- Release version: 1.6.9; Android `versionCode`: 19.
