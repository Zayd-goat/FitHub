# Start Here — FitHub 1.6.27

Use `FitHub_1.6.27_PATCH_FROM_1.6.26.zip` only when GitHub already contains the complete FitHub 1.6.26 source. Otherwise use `FitHub_1.6.27_COMPLETE_UPDATE.zip`.

1. Keep your currently working APK until the new build passes testing.
2. Extract the correct ZIP.
3. Upload its contents into the FitHub repository root, preserving every folder path.
4. Replace existing files and add every new file.
5. Include the hidden `.github/workflows/build-apk.yml` path.
6. Do not upload `.expo`, `node_modules`, `.env`, `google-services.json`, `android` or `ios`.
7. Commit the changes.
8. Open **Actions → Build FitHub APK → Run workflow**, select `main`, and run it.
9. Download `FitHub-1.6.27-APK` only after every workflow stage is green.
10. Install and test Home, Food, navigation, light/dark themes and Android Back behaviour.

No Supabase SQL migration, Edge Function deployment, cron change or new secret is required for 1.6.27.
