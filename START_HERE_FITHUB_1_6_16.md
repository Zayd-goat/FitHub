# Start Here — FitHub 1.6.16

FitHub 1.6.16 is a complete source snapshot. Use `FITHUB_1_6_16_COMPLETE_UPDATE_GUIDE.md` for the full procedure.

## Important rules

- Do not delete the GitHub repository itself.
- Do not delete `.git` if you update with GitHub Desktop.
- Replace the old project folders with the matching folders from this update.
- Upload `index.js`; `package.json` uses it as the application entry point.
- Do not upload `node_modules`, `.env`, generated `android`/`ios` folders, build output, APKs, or a real `google-services.json`.
- Run only `supabase/UPDATE_2026_08_24_FITHUB_1_6_16_ADDITIVE.sql` for this release, once.
- Deploy the updated `friend-notifications` Edge Function before testing remote gym invites.

## Release identity

- App version: `1.6.16`
- Android version code: `26`
- APK workflow artifact: `FitHub-1.6.16-APK`

## Required GitHub Actions configuration

- Secret: `EXPO_PUBLIC_SUPABASE_URL`
- Secret: `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Variable: `EXPO_PUBLIC_EXPO_PROJECT_ID`
- Secret: `GOOGLE_SERVICES_JSON_BASE64`

The final two values are needed for remote gym-invite notifications. See the complete guide for setup and testing.
