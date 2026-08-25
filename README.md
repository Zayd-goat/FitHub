# FitHub 1.6.17

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness application backed by Supabase.

Start with [START_HERE_FITHUB_1_6_17.md](START_HERE_FITHUB_1_6_17.md), then follow [FITHUB_1_6_17_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_17_COMPLETE_UPDATE_GUIDE.md).

## 1.6.17 highlights

- Signup confirmation email, resend confirmation, Forgot Password, reset email, and in-app new-password flow.
- Native confirmation and recovery deep links.
- Shared gym sessions with leader-controlled realtime workout plans.
- Same synced workout or individual workout choice for every participant.
- Private per-user weights, reps, completed sets, cardio results, and workout history.
- Home **Your Week** card opens the monthly calendar and manual past-workout entry.
- Theme-consistent transparent/white-stage exercise presentation for male and female artwork.
- Existing 1.6.16 post editing, manual supplement tracking, notification actions, pull-to-refresh, T-Bar Row correction, and full exercise artwork audit are preserved.

## Release identity

- App: `1.6.17`
- Android version code: `27`
- APK artifact: `FitHub-1.6.17-APK`
- New SQL: `supabase/UPDATE_2026_08_25_FITHUB_1_6_17_ADDITIVE.sql`

## Authentication setup

Supabase Authentication must allow:

```text
fithub://auth-confirmed
fithub://reset-password
```

Enable **Confirm email**, then install:

- `supabase/confirmation-email.html` as the Confirm signup template.
- `supabase/password-recovery-email.html` as the Reset password/Recovery template.

The mobile app uses only the Supabase publishable/anon key. Never embed the service-role key, SMTP password, Firebase service-account key, or Android keystore in the repository or APK.

## Build

The included `.github/workflows/build-apk.yml` installs locked dependencies, type-checks the application, audits every exercise visual, generates Android, builds the APK, and uploads `FitHub-1.6.17-APK`.

## Safety boundary

FitHub keeps the existing under-18 nutrition safeguards: accounts under 18 do not receive generated calorie or macro targets. Training suggestions are informational and do not replace qualified coaching or medical advice.
