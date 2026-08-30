# Start Here — FitHub 1.6.26

Use the small patch only when the GitHub repository already contains the complete FitHub 1.6.25 release. Otherwise use the complete 1.6.26 source package.

1. Keep the current working APK until the new build passes testing.
2. Extract the chosen ZIP.
3. Upload the contents into the GitHub repository root, preserving every folder path.
4. Include the hidden `.github/workflows/build-apk.yml` file.
5. Do not upload `.expo`, `node_modules`, `.env`, `google-services.json`, `android` or `ios`.
6. Commit the changes.
7. Open **Actions → Build FitHub APK → Run workflow** and select `main`.
8. Download `FitHub-1.6.26-APK` only after every workflow stage is green.
9. Install the APK and test the Food screen in light, dark and custom themes.

No Supabase SQL migration, Edge Function deployment, cron change or new secret is required for 1.6.26.
