# Start Here — FitHub 1.6.17

FitHub 1.6.17 is a complete source snapshot. Follow `FITHUB_1_6_17_COMPLETE_UPDATE_GUIDE.md` from top to bottom.

## Release identity

- App version: `1.6.17`
- Android version code: `27`
- APK artifact: `FitHub-1.6.17-APK`
- New migration: `supabase/UPDATE_2026_08_25_FITHUB_1_6_17_ADDITIVE.sql`

## Important rules

- Do not delete the GitHub repository, `.git`, repository Settings, Actions secrets, or variables.
- You may replace complete source folders with the matching folders from this ZIP.
- Upload the root `index.js`; `package.json` uses it as the app entry point.
- Do not upload `.env`, `node_modules`, generated `android`/`ios` folders, a keystore, a Firebase service-account JSON, or `google-services.json`.
- Run only the new 1.6.17 migration once. Do not rerun `schema.sql` or every previous migration.
- Add both FitHub mobile redirect URLs and both supplied email templates in Supabase Authentication.
- No new GitHub secret is required for confirmation or password-reset email.

## The two new Supabase redirect URLs

```text
fithub://auth-confirmed
fithub://reset-password
```

The complete guide includes exact click-by-click instructions and a release test checklist.
