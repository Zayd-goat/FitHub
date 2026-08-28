# FitHub 1.6.17 Changelog

Release date: 25 August 2026

## Account email and password recovery

- Added a dedicated post-sign-up confirmation screen.
- Added resend-confirmation-email support.
- Added a visible **Forgot password?** action to sign in.
- Added an email-entry password-recovery screen with a non-enumerating response.
- Added the in-app new-password and password-confirmation screen.
- Added handling for both implicit token links and authorization-code links.
- Added native deep links for `fithub://auth-confirmed` and `fithub://reset-password`.
- Added branded Confirm signup and Reset password Supabase email templates.

## Shared gym workouts

- Connected scheduled gym invites to shared gym sessions.
- Added a leader-managed shared exercise plan with live Supabase Realtime updates.
- Each accepted participant chooses **Same synced workout** or **Build my own workout**.
- Same-workout mode synchronizes exercise selection, order, planned sets, and planned reps.
- Personal weights, completed sets, cardio results, and workout history remain private per account.
- Added exercise add/remove/reorder controls for the current leader.
- Added safe leader transfer to another accepted participant.
- Preserves already-completed local work if a leader removes an exercise during a session.
- Joint completed-workout posts still require consent from every included participant.

## Home, history, notifications, and Train UI

- The full **Your Week** card now opens the monthly workout calendar.
- The calendar retains manual past-workout add/edit/delete support from 1.6.16.
- Updated the Run Metrics icon to the more complete runner design.
- Immediate invite and scheduled gym-reminder taps now both open the shared gym flow.
- Notification taps continue to dismiss the handled notification.
- Exercise detail, active-workout, movement-guide, preview, picker, and shared-plan artwork uses a clean white rounded image stage in dark themes.
- Light themes continue to show transparent figures/equipment without off-white image blocks.
- The same presentation applies to male and female assets.

## Release and database

- Version: `1.6.17`
- Android version code: `27`
- Added the additive shared-session migration `UPDATE_2026_08_25_FITHUB_1_6_17_ADDITIVE.sql`.
- Updated the GitHub Actions artifact name to `FitHub-1.6.17-APK`.
- Preserved FitHub's existing under-18 nutrition safeguards.
