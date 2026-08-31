# FitHub 1.6.28 Complete Step-by-Step Update Guide

## 1. Choose the correct ZIP

- Use `FitHub_1.6.28_PATCH_FROM_1.6.27.zip` only if GitHub already contains the complete FitHub 1.6.27 source.
- Use `FitHub_1.6.28_COMPLETE_UPDATE.zip` if the repository is older, incomplete, or uncertain.

## 2. Extract and upload

1. Extract the chosen ZIP.
2. Open the FitHub GitHub repository root—the page containing `app.json`, `package.json`, `src`, and `assets`.
3. Select **Add file → Upload files**.
4. Drag all contents of the extracted update folder into the repository root.
5. Preserve every supplied folder path and replace matching files.
6. Commit the upload to `main`.

Do not upload `.expo`, `node_modules`, `.env`, `google-services.json`, `android`, `ios`, signing files, secrets, or tokens.

## 3. Confirm the release identity

Open `app.json` and confirm:

```text
Version: 1.6.28
Android versionCode: 38
iOS buildNumber: 38
Android package: com.fithub.app
```

## 4. Supabase

No Supabase action is required. Do not run an old SQL migration or redeploy an Edge Function solely for this update.

## 5. Build the APK

1. Open **Actions** in GitHub.
2. Select **Build FitHub APK**.
3. Select **Run workflow**, choose `main`, and start the run.
4. Wait for install, TypeScript, audits, Expo prebuild, and Android build to finish successfully.
5. Download the `FitHub-1.6.28-APK` artifact.
6. Extract it to obtain `FitHub.apk`.

## 6. Test the Friends update

1. Open Friends and confirm the Feed, Following, Invites and My Posts tabs are visible.
2. Confirm Feed filters and workout-post cards render correctly.
3. Search for a member and send a friend request.
4. Toggle Posts and PR alerts for an existing friend.
5. Accept and decline a gym invite and confirm it disappears from the pending list.
6. Confirm friend requests offer Confirm and Remove actions.
7. Open the gym-session planner and send an invite.
8. Open My Posts and confirm no friends' posts appear there.
9. Test own-post search, filters, grid/list switching and post controls.
10. Test post likes, comments, sharing, edit-photo flow and Android Back.
11. Confirm Home, Train, Food and You still open from the bottom navigation.

## 7. Exact small-patch files

See `PATCH_FILES_1_6_28.txt` for the exact path-by-path replacement list.

