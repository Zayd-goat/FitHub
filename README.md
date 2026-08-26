# FitHub 1.6.18

FitHub is an Expo/React Native training, nutrition, progress, and social-fitness application backed by Supabase.

Start with [START_HERE_FITHUB_1_6_18.md](START_HERE_FITHUB_1_6_18.md), then follow [FITHUB_1_6_18_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_18_COMPLETE_UPDATE_GUIDE.md).

## 1.6.18 highlights

- Theme-aware Home reference layout, custom quick-access icons, weekly calendar/rings, split/rest art, notification bell, and raised Train navigation.
- Birthday-based onboarding and profile editing with automatic yearly age calculation.
- Private Realtime notification center for gym invites, invite responses, friend requests, posts, PRs, and system messages.
- Accept/Decline actions and automatic read/dismiss behavior.
- Supabase Custom SMTP setup package for signup confirmation and Forgot Password.
- Full 472-file male/female background and integrity pass.
- Correct male/female T-Bar Row, Decline Sit-Up, and Dumbbell Lateral Raise artwork.
- Transparent light-theme artwork and white rounded dark-theme stages across every Train flow.
- Manual past workout and supplement-history corrections, post editing, pull-to-refresh, and synced/independent shared gym workouts preserved.

## Release identity

- App: `1.6.18`
- Android version code: `28`
- APK artifact: `FitHub-1.6.18-APK`
- New SQL: `supabase/UPDATE_2026_08_25_FITHUB_1_6_18_ADDITIVE.sql`

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

For delivery to normal user addresses, configure Supabase Custom SMTP. Then follow [FITHUB_1_6_18_EMAIL_AND_NOTIFICATION_SETUP.md](FITHUB_1_6_18_EMAIL_AND_NOTIFICATION_SETUP.md) for the matching Expo/Firebase/Edge Function push setup.

## Build

The included `.github/workflows/build-apk.yml` installs locked dependencies, type-checks the application, audits every exercise visual, generates Android, builds the APK, and uploads `FitHub-1.6.18-APK`.

## Safety boundary

FitHub keeps the existing under-18 nutrition safeguards: accounts under 18 do not receive generated calorie or macro targets. Training suggestions are informational and do not replace qualified coaching or medical advice.
