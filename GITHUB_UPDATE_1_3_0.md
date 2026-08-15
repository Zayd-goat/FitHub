# FitHub 1.3.0 — GitHub + APK Update Guide

Use **FitHub_Update_1.3.0.zip** only. Do not delete your existing `src` or `assets` folders first.

## 1. Extract the update
1. Download `FitHub_Update_1.3.0.zip`.
2. Right-click it and choose **Extract All**.
3. Open the extracted `FitHub_Update_1.3.0` folder.
4. You should see `app.json`, `package.json`, `src`, `assets`, `supabase`, and this guide.

## 2. Run the Supabase update first
1. In the extracted folder open `supabase`.
2. Open `UPDATE_2026_08_12_FRIENDS_PR_NOTIFICATIONS.sql`.
3. Copy the full SQL file.
4. Open your existing FitHub project in Supabase.
5. Click **SQL Editor**.
6. Click **New query**.
7. Paste the SQL.
8. Click **Run**.
9. Continue only after Supabase reports success.

Do **not** rerun the old full `schema.sql`.

This SQL adds:
- gym-session invites;
- optional workout-post photo fields;
- private `workout-media` storage;
- the richer friend-feed RPC used by FitHub 1.3.0.

## 3. Open the GitHub repository
1. Open the existing FitHub repository on GitHub.
2. Click **Code**.
3. Confirm the branch is `main`.

## 4. Upload the update files
1. Click **Add file** → **Upload files**.
2. Open the extracted `FitHub_Update_1.3.0` folder on your computer.
3. Upload these items from *inside* that folder:
   - `app.json`
   - `package.json`
   - `src`
   - `assets`
4. You may also upload `CHANGELOG_1_3_0.md`, but it is optional.

Do not upload the outer `FitHub_Update_1.3.0` folder itself. The repository must end up with paths such as:
- `src/screens/tabs/WorkoutTab.tsx`
- `src/screens/tabs/FriendsTab.tsx`
- `src/screens/ProgressScreen.tsx`
- `src/lib/notifications.ts`
- `assets/cardio/treadmill.png`

Do **not** delete your existing `src` or `assets` folders. GitHub should replace matching files and add the new files while leaving all unrelated existing files in place.

## 5. Commit the update
1. Scroll to the bottom of the upload page.
2. Commit message: `Update FitHub to 1.3.0 - cardio friends notifications PR graphs`
3. Choose **Commit directly to the main branch** if GitHub shows that option.
4. Click **Commit changes**.

## 6. Do not change your existing secrets
Leave these existing repository secrets exactly as they are:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

You also do not need to replace `.github/workflows/build-apk.yml` for this update.

## 7. Start the APK build
1. Click the repository **Actions** tab.
2. Click **Build FitHub APK** on the left.
3. The push to `main` should create a new run automatically.
4. Use the newest run created by the FitHub 1.3.0 commit.

If no run starts:
1. Click **Run workflow**.
2. Select branch `main`.
3. Click the green **Run workflow** button.

## 8. Wait for GitHub Actions
The current FitHub workflow should run steps including:
- Checkout
- Node setup
- Java setup
- Android SDK setup
- Install dependencies
- Expo prebuild
- Gradle APK build
- Upload APK artifact

Wait until the workflow has a green checkmark.

### If the workflow fails
1. Open the failed run.
2. Click the `android-apk` job.
3. Find the **first** step with a red X.
4. Open that step.
5. Take a screenshot showing the first real error message.
6. Send that screenshot in ChatGPT.

Do not start deleting files or rerunning old SQL because of a build error.

## 9. Download the APK
After the build succeeds:
1. Open the successful workflow run.
2. Scroll down to **Artifacts**.
3. Click **FitHub-APK**.
4. GitHub downloads a ZIP.
5. Extract that ZIP.
6. Inside should be `FitHub.apk`.

## 10. Install it on Android
1. Transfer `FitHub.apk` to the phone.
2. Tap the APK in the Files app.
3. Choose **Update** if Android recognizes the existing FitHub installation.
4. If Android asks for permission to install from that source, enable **Allow from this source**, return, and install.

FitHub 1.3.0 uses Android `versionCode` 6.

## 11. Test the new features
### Cardio
- Open **Train**.
- Filter to **Cardio**.
- Check treadmill, running, walking, cycling, rowing, elliptical, StairMaster, SkiErg, jump rope, VersaClimber and swimming.
- The old stick-figure fallback should be replaced by realistic cardio images for these entries.

### Gym invites
- Open **Friends** → **Invites**.
- Choose a friend.
- Enter a future date and time.
- Send the invite.
- On the friend's account, accept the invite.
- Confirm the accepted session appears under **Upcoming gym sessions**.
- Allow notification permission when FitHub asks for it.

### 30-minute reminder
- For testing, create a session more than 30 minutes in the future.
- FitHub schedules the local reminder for 30 minutes before the session.

### Persistent workout
- Start a workout.
- Check the Android notification shade for the active-workout notification.
- Switch to another app or close FitHub from recent apps.
- Reopen FitHub and go to **Train**.
- The active workout should restore from its original start time.
- Finish or explicitly delete the workout to remove the active-workout notification.

### Workout photo post
- Finish a workout.
- Choose one of:
  - **Keep private**
  - **Post stats**
  - **Add photo & post**
- If adding a photo, allow photo-library access.
- Check **Friends** → **Feed**.

### PR graphs
- Open **Home** → **View all** progress.
- Pin strength and/or cardio exercises.
- Tap an exercise.
- Strength graphs use **Weight (kg)** on X and **Reps** on Y.
- Distance cardio graphs use **Time (min)** on X and **Distance (km)** on Y.
- Time-only cardio graphs use session number on X and duration on Y.
- Tap graph points to see the exact recorded result and date.
