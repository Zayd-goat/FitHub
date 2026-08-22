# FitHub 1.6.1 complete one-go update guide

## A. Upload the source to GitHub

1. Extract `FitHub_1.6.1_COMPLETE_UPDATE.zip`.
2. Open the inner `FitHub` folder containing `App.tsx`, `package.json`, `src`, `supabase`, `assets` and `.github`.
3. In the root of the existing GitHub repository choose **Add file → Upload files**.
4. Upload everything inside the inner FitHub folder, preserving paths. Replace matching files.
5. Do not upload `node_modules`, `.expo`, a real `.env`, `android/app/build`, or `supabase/.temp`.
6. Verify `.github/workflows/build-apk.yml` exists and says `assembleRelease`, not `assembleDebug`.
7. Commit to `main` with message `FitHub 1.6.1 complete update`.

## B. Apply Supabase changes once

1. Open Supabase → FitHub project → SQL Editor → New query.
2. Open `supabase/UPDATE_2026_08_17_FITHUB_1_6_1_ADDITIVE.sql` from the extracted folder.
3. Copy the entire file, paste it into SQL Editor and click **Run** once.
4. Do not rerun `schema.sql` or any old baseline migration.
5. This migration retains old step data but marks the feature retired.

## C. Configure the upgraded FatSecret account

1. In FatSecret Platform confirm the features/scopes approved for your upgraded application.
2. Rotate any credential ever exposed in a screenshot.
3. Open Command Prompt in the inner FitHub folder.
4. Link the project if needed: `npx supabase link --project-ref YOUR_PROJECT_REFERENCE`.
5. Store credentials server-side only:
   `npx supabase secrets set FATSECRET_CLIENT_ID="YOUR_ID" FATSECRET_CLIENT_SECRET="YOUR_SECRET" FATSECRET_SCOPES="YOUR_APPROVED_SCOPES"`
6. Deploy the proxy: `npx supabase functions deploy nutrition-proxy`.
7. Never place the FatSecret secret in GitHub, `.env.example`, Expo configuration or Android code.
8. Barcode and localization work only when those capabilities are approved for the account.

## D. Deploy friend notifications

Run `npx supabase functions deploy friend-notifications --no-verify-jwt`. Keep the existing `FRIEND_NOTIFICATION_CRON_SECRET` and cron schedule. If they were never configured, follow `FITHUB_1_6_0_QUEUED_UPDATE_STEPS.md`.

## E. Publish official monthly challenges

In Supabase SQL Editor, copy this template and replace the example values. Use age-appropriate targets; do not create restrictive nutrition or unsafe training-volume challenges for minors.

```sql
select public.archive_expired_official_challenges();
insert into public.community_challenges(
 creator_id,creator_display_name,title,description,target_type,target_value,unit,
 visibility,starts_at,ends_at,difficulty,difficulty_source,official_month,minimum_age,maximum_age
) values (
 'YOUR_DEVELOPER_USER_UUID','FitHub','Monthly Consistency','Complete planned training days safely',
 'active_days',8,'days','public','2026-09-01T00:00:00Z','2026-09-30T23:59:59Z',
 3,'official','2026-09-01',13,null
);
```

Expired official challenges leave the active list but remain attached to user history.

## F. Build the standalone APK

1. GitHub repository → **Actions** → **Build FitHub APK**.
2. Click **Run workflow**, choose `main`, then **Run workflow**.
3. Wait for a green check.
4. Open the newest run → **Artifacts** → download `FitHub-APK`.
5. Extract the artifact ZIP to obtain `FitHub.apk`.
6. Never install an `app-debug.apk`; debug APKs require Metro and produce “Unable to load script”.

## G. Install

1. Transfer `FitHub.apk` to the phone.
2. Install over the existing app to retain local state. VersionCode 11 identifies it as newer.
3. If Android reports a signature conflict, rebuild with the same signing key as the installed version. Uninstalling may remove local-only data.

## H. Test checklist

- Supplement notification: Taken; Reschedule; colour legend and calendar dots.
- Food: FatSecret search, barcode if approved, serving choice, water add/undo, food removal.
- Under-18 account: meal journal remains neutral; personalised calorie/macro targets remain hidden.
- Challenges: choose 1–5 stars, complete from real activity, view completed history, official monthly expiry.
- Feed: owner can delete a post; underlying workout remains in History.
- Train: reorder unfinished exercises with Next/Last/Up/Down during an active workout.
- Home: no Recent Workouts or Clubs cards; Clubs remain under Profile.
- Bluetooth: enable Nearby Devices, select Connect Equipment near a powered-on FTMS machine, verify connect/lost/unsupported states. Test on a release APK, not Expo Go.
- Confirm no Steps screen, step leaderboards or activity-recognition permission remain.
