# FitHub 1.6.29 complete update guide

## What this release changes

- **You:** profile dashboard, account snapshots, purpose-built quick-access art, clearer account/settings groups.
- **Workout:** guided Choose → Configure → Start structure, improved visual hierarchy and session status.
- **Journey:** current-period progress, prior-period comparison and easier-to-scan reports.
- **Supplements:** today's routine, calendar, editable daily check-ins and schedule management.
- **Add Meal:** matches the Food visual system with meal artwork, meal switching, search, quick add and custom entry.

Existing workout recovery, saved workouts, exercise reordering, movement guides, past workout logging, Food journal behavior, Friends/My Posts, pull-to-refresh, theme support and Android Back behavior remain in place.

## Option A — patch a confirmed 1.6.28 repository

1. Download and extract `FitHub_1.6.29_PATCH_FROM_1.6.28.zip`.
2. Open the extracted `FitHub_1.6.29_PATCH_FROM_1.6.28` folder.
3. Copy everything inside that folder into the root of your FitHub repository.
4. Replace matching files while preserving their folders.
5. Review `PATCH_FILES_1_6_29.txt` to confirm every required path is present.
6. Commit the changes and push them to GitHub.

## Option B — use the complete project

Use this when your repository version is uncertain.

1. Create a backup branch.
2. Extract `FitHub_1.6.29_COMPLETE_UPDATE.zip`.
3. Copy the project contents into the repository root and replace matching project files.
4. Keep your configured GitHub repository secrets and variables; they are not stored in the ZIP.
5. Commit and push.

## Build the APK

1. In GitHub, open **Actions**.
2. Choose **Build FitHub APK**.
3. Select **Run workflow**, or merge/push the update to `main`.
4. Wait for the checks and Android release build to finish.
5. Open the completed workflow run.
6. Download the artifact named `FitHub-1.6.29-APK`.
7. Extract the artifact to obtain `FitHub.apk`.

Required repository configuration remains unchanged:

- Secret: `EXPO_PUBLIC_SUPABASE_URL`
- Secret: `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Secret: `GOOGLE_SERVICES_JSON_BASE64`
- Variable: `EXPO_PUBLIC_EXPO_PROJECT_ID`
- Optional variable: `EXPO_PUBLIC_FITHUB_DOWNLOAD_URL`

## Do not upload

- `.expo`
- `node_modules`
- `dist-android`
- `.env` files
- `google-services.json`
- Android signing files
- secrets, private keys or tokens

## Supabase deployment

None. FitHub 1.6.29 uses the existing schema, storage, notification and Edge Function setup. Do not rerun an old migration or redeploy an Edge Function solely for this UI release.

## Younger-account safeguards

- Food remains a neutral meal journal.
- Online nutrition search, barcode nutrition lookup and nutrition targets remain unavailable.
- Supplement tracking provides no recommendations or dosing instructions and explicitly requires parent, guardian or qualified-clinician support.
- Load-based Clubs remain hidden.
