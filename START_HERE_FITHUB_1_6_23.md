# Start Here — FitHub 1.6.23

This folder contains the complete FitHub 1.6.23 source project.

## Confirm the release

```text
App version: 1.6.23
Android versionCode: 33
iOS buildNumber: 33
GitHub artifact: FitHub-1.6.23-APK
```

## Choose the correct upload method

- If your GitHub repository already contains FitHub 1.6.22, you may upload only the files listed under **Patch-only update** in `FITHUB_1_6_23_COMPLETE_UPDATE_GUIDE.md`.
- If the repository is older, incomplete or uncertain, replace it with the complete 1.6.23 folder.

Do not upload credentials or `google-services.json`. Do not run SQL or redeploy Edge Functions for this UI release.

Then run **Build FitHub APK** in GitHub Actions and test the resulting APK on the Android phone.
