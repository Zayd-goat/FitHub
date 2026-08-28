# FitHub 1.6.20 Complete Step-by-Step Update Guide

Follow these steps in order.

## 1. Back up the working project

Keep a copy of your current FitHub source and do not delete the last working APK until 1.6.20 passes testing.

## 2. Upload the complete source to GitHub

1. Extract the FitHub 1.6.20 ZIP.
2. Open your FitHub GitHub repository.
3. Replace the repository files with the contents of the extracted project folder.
4. Make sure hidden paths such as `.github/workflows/build-apk.yml` are included.
5. Commit the update to `main`.
6. Confirm `app.json` shows version `1.6.20`, Android version code `30`, and iOS build number `30`.

## 3. Run the additive Supabase migration

1. Open Supabase Dashboard → **SQL Editor**.
2. Select **New query**.
3. On your computer, open:

```text
supabase/UPDATE_2026_08_28_FITHUB_1_6_20_ADDITIVE.sql
```

4. Copy all SQL from that file and paste it into SQL Editor.
5. Click **Run** once.
6. Confirm the result is successful with no red error.

Do not run `schema.sql`. The 1.6.20 migration assumes the 1.6.19 migration was already installed.

## 4. Sign in to the Supabase CLI

Open Command Prompt in the extracted project folder. To type the token directly in the command, run:

```cmd
npx supabase login --token "sbp_PASTE_YOUR_PERSONAL_ACCESS_TOKEN_HERE"
```

Use a Supabase personal access token beginning with `sbp_`. Do not use the project publishable key, service-role key, FatSecret secret, or cron secret. This direct method can remain in command history; delete that command from history afterward if the computer is shared.

Confirm access:

```cmd
npx supabase projects list
```

## 5. Redeploy the notification worker

Run:

```cmd
npx supabase functions deploy friend-notifications --project-ref qduquvyrmaywssbzbist --no-verify-jwt
```

The deployed function must come from this 1.6.20 project folder.

## 6. Verify the cron job

In Supabase → **Cron → Jobs**, keep only one active FitHub notification job:

```text
Name: fithub-friend-notifications
Schedule: * * * * *
Method: POST
URL: https://qduquvyrmaywssbzbist.supabase.co/functions/v1/friend-notifications
Header: x-cron-secret: YOUR_PRIVATE_CRON_SECRET
Body: {}
```

Do not expose the header value. Keep the older duplicate job inactive or delete it after confirming the active job works.

## 7. Build the APK

1. Open GitHub → **Actions**.
2. Select **Build FitHub APK**.
3. Click **Run workflow**.
4. Choose `main` and run it.
5. Confirm every stage is green, especially type-checking, source references, exercise visuals, Android generation, and the release APK build.
6. Download the artifact named:

```text
FitHub-1.6.20-APK
```

7. Extract it to obtain `FitHub.apk`.

## 8. Test the update

Install the APK on Android and test:

1. Home quick cards and every bottom-navigation tab in light and dark themes.
2. Food Search, Scan, Recent, Saved Meals, every meal add button, expansion, water add/undo, and nutrition overview where available.
3. Add a backdated workout with two strength exercises and one cardio exercise. Save sets, reps, weight, distance, time, and notes; reopen and edit it.
4. Start a workout, long-press an exercise, drag it, move another **Next**, and move another to **End**. Confirm entered set data stays intact.
5. Open several exercise guides and check setup, performance, breathing, mistakes, and finish sections.
6. Open a post editor and press Android Back. Confirm it returns to Friends without exiting the app.
7. Swipe an in-app notification away.
8. Send a gym invite between two accounts. Confirm the recipient gets it immediately.
9. Accept from the Android notification. Confirm the notification disappears and the sender receives an accepted notification.
10. Repeat with Decline and confirm the sender receives a declined notification.
11. Confirm an accepted future session still schedules the separate 30-minute reminder.
12. Open Community → Clubs on an adult test account with completed supported lift history. Confirm no `club_key` error appears and the highest qualifying club is shown.

The release is complete after the GitHub build is green and the two-device notification tests pass.
