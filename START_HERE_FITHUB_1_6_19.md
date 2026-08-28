# Start Here — FitHub 1.6.19

This ZIP contains the full FitHub 1.6.19 source project, not a partial patch.

## Release identity

- App version: `1.6.19`
- Android version code: `29`
- iOS build number: `29`
- APK artifact: `FitHub-1.6.19-APK`
- New migration: `supabase/UPDATE_2026_08_26_FITHUB_1_6_19_ADDITIVE.sql`

## Install in this order

1. Back up the current GitHub repository.
2. Extract this complete update.
3. Replace the repository source while keeping the existing hidden `.git` folder and GitHub settings.
4. Commit and push the source.
5. Run the new 1.6.19 SQL once after the 1.6.18 migration.
6. Redeploy `friend-notifications` and `nutrition-proxy`.
7. Keep one unified once-per-minute notification cron job and verify it returns HTTP 200.
8. Run the GitHub Actions APK workflow.
9. Download only the APK from a completely green workflow.
10. Test the checklist in the complete guide with two accounts/devices.

## Important files

```text
FITHUB_1_6_19_COMPLETE_UPDATE_GUIDE.md
CHANGELOG_1_6_19.md
FITHUB_1_6_19_VALIDATION_REPORT.md
supabase/UPDATE_2026_08_26_FITHUB_1_6_19_ADDITIVE.sql
supabase/functions/friend-notifications/index.ts
supabase/functions/nutrition-proxy/index.ts
```

Do not upload `.env`, `node_modules`, generated `android`/`ios` folders, APK/AAB files, a keystore, `google-services.json`, or any private credential.
