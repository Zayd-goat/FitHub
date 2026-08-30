# Start Here — FitHub 1.6.25

Use the small patch only when the GitHub repository already contains the complete FitHub 1.6.24 release. Otherwise use the complete 1.6.25 source package.

1. Keep a copy of the current working source and APK.
2. Extract the selected ZIP.
3. Upload every included file with the same folder path, including `.github`.
4. Do not upload `.expo`, `node_modules`, `.env`, `google-services.json`, tokens, passwords or private keys.
5. Do not run a Supabase migration or redeploy an Edge Function for this release.
6. Run **Build FitHub APK** from GitHub Actions on `main`.
7. Download the `FitHub-1.6.25-APK` artifact only after every stage is green.
8. Install the APK and complete the Home, Challenges and Clubs tests in the full guide.

Full instructions: [FITHUB_1_6_25_COMPLETE_UPDATE_GUIDE.md](FITHUB_1_6_25_COMPLETE_UPDATE_GUIDE.md)
