# FitHub 1.6.31 complete update guide

## What this release changes

- Every `Alert.alert` call now opens in a branded FitHub action sheet instead of the old native-looking popup.
- The action sheet can be closed with its X button, by tapping outside, or with the Android hardware Back button.
- Longer menus remain scrollable, so the complete Post controls menu now includes Delete post.
- The You tab uses the approved realistic artwork treatment for all seven destination cards.
- Every 1.6.30 route and safeguard remains in place.

## Option A — update an existing FitHub 1.6.30 repository

1. Download and extract `FitHub_1.6.31_PATCH_FROM_1.6.30.zip`.
2. Open its `FitHub_1.6.31_PATCH_FROM_1.6.30` folder.
3. Copy every file and folder inside it into the root of your FitHub repository.
4. Keep the folder structure exactly as supplied and confirm replacements.
5. Commit the changes on a new branch.

## Option B — replace an older or uncertain repository

1. Download `FitHub_1.6.31_COMPLETE_UPDATE.zip`.
2. Extract the `FitHub_1.6.31_COMPLETE_UPDATE` folder.
3. Use those extracted contents as the complete project source.
4. Restore your deployment secrets only through GitHub Secrets or your local environment. Do not commit them.

## Build the APK in GitHub

1. Push the updated project to GitHub.
2. Open the repository’s **Actions** tab.
3. Select **Build FitHub APK**.
4. Choose **Run workflow** on the 1.6.31 branch.
5. Wait for the workflow to finish successfully.
6. Open the completed run and download `FitHub-1.6.31-APK`.

## Specific runtime files replaced by the patch

- `.github/workflows/build-apk.yml`
- `App.tsx`
- `app.json`
- `package.json`
- `package-lock.json`
- `src/components/FitHubAlertProvider.tsx`
- `src/components/YouCardArtwork.tsx`
- `src/screens/tabs/ProfileTab.tsx`
- `assets/you_ui_v1/clubs.png`
- `assets/you_ui_v1/customize.png`
- `assets/you_ui_v1/gym_together.png`
- `assets/you_ui_v1/journey.png`
- `assets/you_ui_v1/supplements.png`
- `assets/you_ui_v1/weekly_split.png`
- `assets/you_ui_v1/workout_split.png`

The patch also includes its audit script, generated report, release notes, instructions and source manifest.

## Files that must not be uploaded

- `.expo`
- `node_modules`
- `dist-android`
- `.env` or any other secret file
- `google-services.json` unless you intentionally manage it through a secure private workflow
- Android keystores, signing credentials, API keys or access tokens

## Verification after installation

1. Open Friends, switch to My Posts and open the three-dot menu on your own post.
2. Confirm every action is visible, including Delete post and Cancel.
3. Close the menu once with the X, once by tapping outside, and once with the Android Back button.
4. Reopen it, select Delete post, and confirm the second warning can also be dismissed with Android Back.
5. If you test deletion, confirm the social post disappears while the completed private workout remains in history.
6. Trigger another popup elsewhere and confirm it uses the same FitHub design.
7. Open You and confirm the seven destination cards use the new realistic artwork.
8. Open every destination and confirm the existing routes still work.

## Database and backend

No new SQL, storage schema, Edge Function or environment variable is required for FitHub 1.6.31.
