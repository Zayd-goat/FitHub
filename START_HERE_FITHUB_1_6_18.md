# Start Here — FitHub 1.6.18

FitHub 1.6.18 is a complete source update. Follow `FITHUB_1_6_18_COMPLETE_UPDATE_GUIDE.md` from top to bottom.

## Release identity

- App version: `1.6.18`
- Android version code: `28`
- APK artifact: `FitHub-1.6.18-APK`
- New migration: `supabase/UPDATE_2026_08_25_FITHUB_1_6_18_ADDITIVE.sql`
- Expo project ID: `3d3a3683-79bb-4711-ae01-1dab82cc21e7`

## Important rules

- Back up the repository before replacing files.
- Do not delete the GitHub repository, `.git`, repository Settings, Actions secrets, variables, branches, or history.
- You may delete and replace the complete `assets`, `src`, `scripts`, `reports`, `supabase`, and `.github` source folders with the matching folders from this ZIP.
- Upload the root `index.js`; `package.json` uses it as the application entry point.
- Do not upload `.env`, `node_modules`, generated `android`/`ios` folders, APK/AAB files, a keystore, a Firebase service-account JSON, or `google-services.json`.
- Run only the new 1.6.18 migration once after the previously installed migrations. Copy the SQL inside the file—not its filename—into Supabase SQL Editor.
- Reconfigure/deploy the supplied `friend-notifications` function because its retry and invalid-token handling changed.
- Supabase Custom SMTP is required for delivery to normal user email addresses. The built-in test email service is not a production mail service.

## Authentication redirect URLs

```text
fithub://auth-confirmed
fithub://reset-password
```

## What changed most visibly

- Home uses the supplied reference structure, theme-responsive styling, custom quick-access icons, a working notification bell, split/rest artwork, weekly rings, and a calendar link.
- Onboarding asks for a birthday once and calculates age automatically each year.
- Train uses transparent artwork in light themes and clean white image stages in dark themes.
- Every referenced male/female exercise PNG received an integrity and background audit.
- Decline Sit-Up, Dumbbell Lateral Raise, and T-Bar Row now use corrected male and female artwork.
- Gym invites and friend requests appear in a private in-app notification center with Accept/Decline controls.

The complete guide includes source replacement, GitHub commit, Supabase email, Firebase/Expo push, Edge Function, APK build, installation, and testing steps.
