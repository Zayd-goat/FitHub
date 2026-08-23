# FitHub 1.6.7 step-by-step update

## 1. Back up the GitHub repository

Download the current repository as a ZIP from GitHub before replacing files.

## 2. Upload the update files

Open the extracted `FitHub_1.6.7_EXERCISE_VISUAL_AUDIT` folder. Upload its contents to the root of the GitHub repository—the same level as `package.json`, `app.json`, `App.tsx`, `src`, `assets` and `.github`.

Use **Add file → Upload files**. Drag these visible items:

- `App.tsx`, `app.json`, `package.json`, `package-lock.json`, `tsconfig.json`
- the complete `src` folder
- the complete `assets` folder
- the complete `scripts` folder
- the complete `.github` folder
- the changelog and guide files

Do not upload `node_modules`, `.expo`, `android`, an APK, or another ZIP into the repository.

For hidden files, use GitHub **Add file → Create new file** only if they are missing. Type the exact filename such as `.gitignore`; then paste its contents from the update folder.

## 3. Commit the files

Enter `FitHub 1.6.7 exercise visual accuracy audit` as the commit message and commit directly to `main`.

## 4. Confirm repository secrets

In GitHub open **Settings → Secrets and variables → Actions**. Confirm these repository secrets still exist:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not put Supabase service-role keys or FatSecret secrets in the Android app or GitHub files.

## 5. Run the automated checks

On a computer, open Command Prompt in the project folder and run:

```text
npm install
npm run audit:exercise-visuals
npm run typecheck
```

The audit should report 230 exercises and 128 male plus 128 female visual families.

## 6. Build the APK with GitHub Actions

Open **Actions → Build FitHub APK → Run workflow → Run workflow**. Wait for the `android-apk` job to become green.

Open the successful run, scroll to **Artifacts**, download `FitHub-APK`, extract it, and install `FitHub.apk` on the Android phone.

## 7. Installation

If Android refuses to replace the current app because its signing key is different, uninstall the old APK only after making sure important server-backed data has synced. Then install the new APK.

## 8. Test both visual profiles

1. Sign in with a test account using the male profile option.
2. Open Train and inspect Chest, Back, Shoulders, Arms, Legs, Core, Full Body and Cardio.
3. Repeat with the female profile option.
4. Confirm exact approved images change to the matching profile set.
5. Confirm unapproved matches show a themed category marker, not a wrong exercise image.
6. Change FitHub themes and confirm card, border, label and action colors change while exercise artwork stays unchanged.
7. Start a workout, reorder exercises, minimize it, return, and finish it.

## 9. Supabase

No SQL migration, secret change, Edge Function deployment or Cron change is needed for 1.6.7.
