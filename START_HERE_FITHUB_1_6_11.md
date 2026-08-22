# Start here — FitHub 1.6.11

1. Open `FITHUB_1_6_11_COMPLETE_UPDATE_GUIDE.md`.
2. Back up the current GitHub repository and current APK.
3. Replace the GitHub project files with the `FitHub` folder from this package. Do not upload `node_modules`, `.expo`, an `.env` file, or a generated `android` folder.
4. Confirm `.github/workflows/build-apk.yml` exists in GitHub.
5. Do not rerun old Supabase migrations that are already installed. This 1.6.11 visual update has no new database migration.
6. Run the Build FitHub APK workflow and download the `FitHub-1.6.11-APK` artifact.

Keep food-provider secrets in Supabase Edge Function secrets. Never put a FatSecret client secret or USDA key in the Android project, GitHub source, or an `EXPO_PUBLIC_` variable.

