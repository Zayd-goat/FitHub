# FitHub 1.6.27 Complete Step-by-Step Update Guide

## 1. Choose the correct ZIP

- Use `FitHub_1.6.27_PATCH_FROM_1.6.26.zip` only if your GitHub repository already contains the complete 1.6.26 source.
- Use `FitHub_1.6.27_COMPLETE_UPDATE.zip` if your repository is older, incomplete, or you are not certain.

## 2. Extract the ZIP

1. Download the chosen ZIP.
2. Open your Downloads folder.
3. Right-click the ZIP and choose **Extract all**.
4. Open the extracted folder.

## 3. Upload the update to GitHub

1. Open the FitHub repository on GitHub.
2. Open the repository root—the page containing `app.json`, `package.json`, `src`, and `assets`.
3. Select **Add file → Upload files**.
4. Drag all contents of the extracted update folder into the upload area.
5. Keep every folder path exactly as supplied.
6. Replace existing files when GitHub identifies matching paths.
7. Add the new `assets/home_ui_v4`, `assets/food_ui_v4`, `FitHubSpriteArt.tsx`, and `FitHubNavIcons.tsx` files.
8. Confirm `.github/workflows/build-apk.yml` is included.
9. Commit the upload to `main`.

Do not upload:

```text
.expo
node_modules
.env
google-services.json
android
ios
```

## 4. Confirm the release identity

Open `app.json` and confirm:

```text
Version: 1.6.27
Android versionCode: 37
iOS buildNumber: 37
Android package: com.fithub.app
```

## 5. Supabase

No Supabase action is required. Do not run an old SQL migration, replace secrets, or redeploy an Edge Function solely for this update.

## 6. Build the APK

1. In GitHub, open **Actions**.
2. Select **Build FitHub APK**.
3. Select **Run workflow**.
4. Choose the `main` branch.
5. Run the workflow.
6. Wait until `npm ci`, TypeScript, audits, Expo prebuild, and Android build are all green.
7. Open the completed workflow run.
8. Download the `FitHub-1.6.27-APK` artifact.
9. Extract the artifact to obtain `FitHub.apk`.

If TypeScript still mentions `absoluteFillObject`, GitHub contains an old `src/screens/tabs/FoodTab.tsx`; upload the 1.6.27 copy again.

## 7. Install and test

Keep the previous APK until these checks pass:

1. Home shows the live seven-day calendar and new realistic workout/active-time artwork.
2. Every Home Quick Access card opens the correct destination.
3. Food shows the new diary, shortcut, meal, and water artwork without checkerboard backgrounds.
4. Search, Scan, Recent, Saved Meals, all four meals, water add/undo and Android Back still work.
5. The bottom navigation shows the short active indicator and raised Train control.
6. Light, dark and custom accent themes remain readable.
7. A younger test account does not see online nutrition search, barcode nutrition lookup, nutrition targets, or load-based Clubs.

## 8. Exact small-patch files

See `PATCH_FILES_1_6_27.txt` for the complete path-by-path list.
