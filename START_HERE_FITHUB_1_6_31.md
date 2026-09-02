# Start here — FitHub 1.6.31

FitHub 1.6.31 applies the approved popup and You-page artwork updates without replacing any working 1.6.30 feature.

## Choose the right download

- If your GitHub repository is already FitHub 1.6.30, use `FitHub_1.6.31_PATCH_FROM_1.6.30.zip`.
- If the repository is older, mixed, or you are unsure, use `FitHub_1.6.31_COMPLETE_UPDATE.zip`.

## Fast update path

1. Create a Git branch such as `fithub-1.6.31`.
2. Download and extract the correct zip.
3. Copy the extracted folder contents into the root of the FitHub repository, keeping the supplied folder structure.
4. Confirm replacements when asked. Do not delete unrelated files.
5. Never upload `.expo`, `node_modules`, `dist-android`, `.env`, `google-services.json`, signing files, secrets or tokens.
6. Commit and push the branch.
7. Open GitHub Actions and run the Android APK workflow.
8. Download the `FitHub-1.6.31-APK` artifact after the run turns green.

No Supabase SQL migration or Edge Function deployment is required for this release.

For the exact file list and verification steps, read `FITHUB_1_6_31_COMPLETE_UPDATE_GUIDE.md`.
