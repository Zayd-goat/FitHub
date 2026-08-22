# FitHub update → GitHub → APK (step by step)

This update contains the full set of changes requested on 9 August 2026.

## What is included

- One-question-at-a-time onboarding with a progress bar.
- Profile editing for onboarding details.
- New workout builder flow: choose exercise → enter sets/reps/weight or cardio distance/duration → add another or start.
- Active workout set table with editable weight/reps, green completion checks and faded completed exercises.
- Expanded cardio library with running, treadmill, walking, cycling, rowing, StairMaster, SkiErg, jump rope, VersaClimber and swimming.
- New FitHub app icon based on the selected latest Concept #1: dark background, red F and white dumbbell.
- Working Progress page with badges, streaks and selectable PR lifts with PR history.
- Food-tab blue-outline/white add buttons, daily progress graphs and 90-day food history.
- Home screen limited to 3 recent workouts; View More opens up to 15 recent workouts.
- Home recent-workout display clears after 7 days without a workout while the saved history remains intact.
- Home Volume and adult Calories Burned values are for the current day and reset at the next local day.
- Full-screen in-app presentation with the phone status bar hidden while FitHub is open; Android users can swipe down from the top to reveal system UI temporarily.
- Social-style workout feed with workout stats and comments.
- Friends challenge Join buttons changed to white with a blue outline.
- Bottom navigation icons restyled to match the supplied reference.
- FitHub app version updated to 1.2.0 / Android versionCode 3.

---

# PART A — Run the Supabase update first

Do this before installing the new APK. Do **not** rerun the full `schema.sql` on your existing project.

1. Extract `FitHub_Update_2026-08-09.zip` on your computer.
2. Open the extracted folder.
3. Open the `supabase` folder.
4. Open `UPDATE_2026_08_09.sql` in a text editor and copy all of it.
5. Open your existing Supabase project in the Supabase Dashboard.
6. Click **SQL Editor** in the left sidebar.
7. Click **New query**.
8. Paste the entire contents of `UPDATE_2026_08_09.sql`.
9. Click **Run**.
10. You should get a successful result. This migration adds preferred height/weight units, PR-lift tracking and the richer friends workout-feed function.

If Supabase shows an error, stop there and send the first red error message before changing anything else.

---

# PART B — Upload the update to the existing GitHub repository

The update contains fewer than 100 files, so you can upload it in one browser upload. GitHub currently allows up to 100 files in a browser upload, with a 25 MiB per-file browser limit.

1. Go to your existing FitHub repository on GitHub.
2. Make sure you are on the **Code** tab and the **main** branch.
3. Click **Add file**.
4. Click **Upload files**.
5. On your computer, open the extracted `FitHub_Update_2026-08-09` folder.
6. Select the **contents inside that folder** — `app.json`, `assets`, `src`, `supabase`, and the guide files. Do **not** drag the outer `FitHub_Update_2026-08-09` folder itself into the repo, because that would create an extra wrapper folder.
7. Drag the selected contents onto GitHub's upload page.
8. Wait for GitHub to finish listing the files.
9. Existing files with the same paths will be replaced by the new versions; the two new screen files and Supabase update file will be added.
10. In the commit message box, enter: `Apply full FitHub feature update`
11. Choose **Commit directly to the main branch** if GitHub offers that option for your repository.
12. Click **Commit changes** / **Propose changes** (the wording can vary depending on your repository settings).

Do not delete or change your existing GitHub Actions secrets.

The two secrets the current workflow expects are:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

---

# PART C — Build the APK in GitHub Actions

Your existing `.github/workflows/build-apk.yml` already builds the FitHub APK, so you do not need to replace it for this update.

1. After the commit finishes, click the **Actions** tab at the top of the GitHub repository.
2. In the left sidebar, click **Build FitHub APK**.
3. You should see a new workflow run created from the commit to `main`.
4. Open the newest run.
5. Wait for the `android-apk` job to finish.
6. The important steps should pass in this order:
   - Checkout
   - Use Node 24
   - Use Java 17
   - Set up Android SDK
   - Install Android API 36
   - Set up Gradle cache
   - Check required app secrets
   - Install dependencies
   - Generate Android project
   - Build installable debug APK
   - Copy APK
   - Upload FitHub APK
7. When the run shows a **green check**, open the run summary page.
8. Scroll to **Artifacts**.
9. Click **FitHub-APK**.
10. GitHub downloads an artifact ZIP.
11. Extract that ZIP on your computer.
12. Inside it you will find `FitHub.apk`.

If no workflow starts automatically:
1. Go to **Actions** → **Build FitHub APK**.
2. Click **Run workflow**.
3. Keep the branch set to `main`.
4. Click the green **Run workflow** button.

---

# PART D — Install the APK on Android

1. Transfer `FitHub.apk` to your Android phone.
2. Tap the APK file.
3. If Android asks whether to allow installs from that browser/files app, allow it for this install.
4. Install FitHub.
5. If Android says the app cannot be installed over the existing FitHub build because the signatures differ, uninstall the old FitHub APK first and then install the new APK. Your Supabase account/workout data remains stored online, although device-only preferences can reset after an uninstall.
6. Sign in with your existing FitHub account.

---

# PART E — Test the new update

After installing, test these in this order:

1. **Onboarding** — with a new/test account, confirm there is one question per screen and the progress bar fills.
2. **You → Profile** — confirm personal/fitness details can be edited and saved.
3. **Train** — tap an exercise and confirm it immediately opens the set/reps/weight or cardio setup screen.
4. Configure one exercise, tap **Add another exercise**, configure another, then tap **Start Workout**.
5. During the workout, edit set values and use the completion circles. Completed exercises should fade.
6. Check cardio exercises such as Outdoor Running and Treadmill Running.
7. Finish the workout and confirm it appears in **Home → Recent Workouts** and **Friends → Workout feed**.
8. **Home → View all** under Progress — confirm the Progress page opens.
9. Add a lift under **My PR lifts**, then tap it to see its PR history.
10. **Home → View more** under Recent Workouts — confirm the workout-history page shows up to 15 workouts.
11. Check that Home Volume is today's total only.
12. On an adult test account, check that Home Calories Burned is marked as an estimate and is today's total only.
13. **Food** — check the white/blue add buttons, progress graphs and History page.
14. **Friends → Challenges** — check the white/blue Join buttons.
15. Check the new bottom navigation icons and the new app icon.
16. Confirm the phone's top status bar is hidden in the main app and can be temporarily revealed by swiping down from the top on Android.

---

# If the GitHub build fails

Do not redo the whole update. Open the failed workflow run, expand the **first red step**, and send a screenshot of that first red error. The first failing step is normally enough to identify the fix.
