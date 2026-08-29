# Start Here — FitHub 1.6.24

This folder contains the complete FitHub 1.6.24 source project.

## Confirm the release

```text
App version: 1.6.24
Android versionCode: 34
iOS buildNumber: 34
GitHub artifact: FitHub-1.6.24-APK
```

## Choose the correct upload method

- If your GitHub repository already contains the complete FitHub 1.6.23 release, use the small `FitHub_1.6.24_PATCH_FROM_1.6.23.zip` and replace only its matching paths.
- If the repository is older, incomplete or uncertain, replace it with the complete FitHub 1.6.24 folder.

Do not upload `.expo`, `node_modules`, `.env`, `google-services.json`, tokens, keys or passwords. Include the hidden `.github` folder when using the complete package.

This Home release needs no SQL migration, Edge Function deployment, secret change or cron change. After uploading, run **Build FitHub APK** in GitHub Actions and test the APK on the Android phone.
