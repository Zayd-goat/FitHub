# FitHub 1.6.26 Complete Step-by-Step Update Guide

## 1. Choose the correct package

Use `FitHub_1.6.26_PATCH_FROM_1.6.25.zip` only when GitHub already contains the complete 1.6.25 source.

Use `FitHub_1.6.26_COMPLETE_UPDATE.zip` when the repository is older, incomplete or uncertain.

## 2. Confirm the release identity

Open `app.json` and confirm:

```text
Version: 1.6.26
Android versionCode: 36
iOS buildNumber: 36
Android package: com.fithub.app
```

## 3. Upload the files

1. Extract the chosen ZIP.
2. Open the extracted release folder.
3. Upload its contents into the root of the FitHub GitHub repository.
4. Preserve every folder path exactly.
5. Replace files when GitHub reports that the path already exists.
6. Add files that are new, including `src/components/FitHubFoodIcons.tsx`.
7. Include `.github/workflows/build-apk.yml`.

Do not upload:

```text
.expo
node_modules
.env
google-services.json
android
ios
```

## 4. Supabase

No Supabase action is required. Do not run an old migration or redeploy a function solely for this release.

## 5. Build the APK

1. Open the repository on GitHub.
2. Select **Actions**.
3. Select **Build FitHub APK**.
4. Select **Run workflow**.
5. Choose `main` and run it.
6. Wait for every stage to turn green.
7. Download the `FitHub-1.6.26-APK` artifact.
8. Extract it to obtain the APK.

## 6. Test the update

Test the following on an Android phone:

1. Food header and seven-day selector.
2. Diary hero progress after logging meals.
3. Search, Scan, Recent and Saved Meals actions.
4. Breakfast, Lunch, Dinner and Snacks expansion and add buttons.
5. Adding and undoing water entries.
6. Light, dark and custom accent themes.
7. Pull-to-refresh and Android Back behaviour.
8. Younger-account safeguards.

Keep the previous APK until these checks pass.
