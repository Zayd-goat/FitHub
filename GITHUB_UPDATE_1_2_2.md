# FitHub 1.2.2 — GitHub APK Update

## 1. Run the new Supabase migration
1. Open your FitHub Supabase project.
2. Open SQL Editor.
3. Click New query.
4. Open `supabase/UPDATE_2026_08_10_SAVED_WORKOUTS.sql` from this update.
5. Copy all of the SQL into Supabase.
6. Click Run.
7. Continue only after it succeeds.

Do not rerun the full `schema.sql`.

## 2. Upload the update to GitHub
1. Open your existing FitHub repository.
2. Make sure the branch is `main`.
3. Click Add file → Upload files.
4. Upload `app.json` and the `src` folder from this update.
5. Let GitHub replace matching files. Do not delete your existing `src` folder first.
6. Commit directly to `main` with the message `Add saved and editable workouts`.

The SQL file does not need to be uploaded for the APK to work, but keeping it in the repository is useful for your records.

## 3. Build the APK
1. Click Actions.
2. Click Build FitHub APK.
3. Open the newest run triggered by your commit.
4. If no run started, click Run workflow, choose `main`, then Run workflow.
5. Wait for a green checkmark.

If the run fails, open the first step with a red X and send that error screenshot.

## 4. Download and install
1. Open the successful workflow run.
2. Scroll to Artifacts.
3. Download `FitHub-APK`.
4. Extract the downloaded ZIP.
5. Transfer `FitHub.apk` to your Android phone.
6. Tap it and choose Update/Install.

## 5. Test the new workout flow
1. Open Train.
2. Configure several exercises.
3. Tap Save Workout.
4. Give it a name and save it.
5. Confirm it appears under Saved Workouts.
6. Tap Start on the saved workout.
7. While the timer is running, change reps or weight.
8. Add and remove a set.
9. Tap + Add Exercise and add another exercise.
10. Remove an exercise from the active workout.
11. Finish the workout normally.
