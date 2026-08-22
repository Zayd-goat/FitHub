# FitHub 1.6.2 one-go update guide

This guide assumes `UPDATE_2026_08_14_FITHUB_1_5_0.sql` has already been run. Do not run the 1.5.0 migration again.

## 1. Back up first

1. Download the current GitHub repository as a ZIP.
2. In Supabase, open Database > Backups and confirm a recent backup exists.
3. Keep the supplied full-source backup ZIP until the new APK has been tested.

## 2. Replace the GitHub project files

The update ZIP contains a `FitHub` folder. Open it and upload **everything inside it** to the root of the GitHub repository, including:

- `.github`
- `assets`
- `src`
- `supabase`
- `.gitignore`
- `App.tsx`, `app.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `eas.json`
- the guides and changelog

Do not upload `node_modules`, `.expo`, an `android` build folder, or the outer ZIP itself. In Windows, enable View > Show > Hidden items so `.github` and `.gitignore` are visible. GitHub may hide dotfiles in some upload dialogs; creating those paths directly in GitHub's web editor is also valid.

## 3. Apply only the post-1.5.0 database updates

In Supabase Dashboard > SQL Editor > New query, run these files in this exact order. Paste the full contents of one file, click Run, wait for success, then continue:

1. `supabase/UPDATE_2026_08_14_FITHUB_1_6_0_ADDITIVE.sql`
2. `supabase/UPDATE_2026_08_15_FITHUB_1_6_0_QUEUED_ADDITIVE.sql`
3. `supabase/UPDATE_2026_08_17_FITHUB_1_6_1_ADDITIVE.sql`

These scripts use `if not exists`, replacement functions, and repeat-safe policies where appropriate. They extend the 1.5.0 baseline instead of recreating its tables.

## 4. Link the local folder to Supabase

Open Command Prompt inside the `FitHub` folder and run:

```bat
npm install
npx supabase login --token YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN
npx supabase link --project-ref YOUR_PROJECT_REFERENCE
```

The project reference is the value shown under Supabase Project Settings > General > Reference ID and is also used in the project URL. A personal access token is created under the Supabase account menu > Access Tokens. Do not paste the database password or a FatSecret secret into GitHub.

## 5. Set server-only secrets

Get the Client ID and Client Secret from the FatSecret Platform developer portal for the upgraded application. From the linked `FitHub` folder run:

```bat
npx supabase secrets set FATSECRET_CLIENT_ID="YOUR_CLIENT_ID" FATSECRET_CLIENT_SECRET="YOUR_CLIENT_SECRET"
```

Optional regional defaults can be added if your FatSecret plan supports them:

```bat
npx supabase secrets set FATSECRET_REGION="ZA" FATSECRET_LANGUAGE="en"
```

Never add these values to `app.json`, `.env`, source files, GitHub variables, or APK settings.

## 6. Deploy the Edge Functions

Run:

```bat
npx supabase functions deploy nutrition-proxy
npx supabase functions deploy food-search
npx supabase functions deploy friend-notifications --no-verify-jwt
```

The notification function should only be called by a protected schedule/server secret. Do not expose a service-role key in the app.

## 7. Add GitHub build secrets

In GitHub open the FitHub repository > Settings > Secrets and variables > Actions > New repository secret. Add:

- `EXPO_PUBLIC_SUPABASE_URL`: Supabase Project Settings > API > Project URL
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase Project Settings > API > publishable/anon key

These are the client-safe Supabase values. Do not add the service-role key or FatSecret Client Secret.

## 8. Build the APK

1. Open the repository's Actions tab.
2. Select **Build FitHub APK**.
3. Choose **Run workflow**, branch `main`, then Run workflow.
4. Wait for a green check.
5. Open the run, scroll to Artifacts, download `FitHub-APK`.
6. Unzip it and copy `FitHub.apk` to the phone.

## 9. Install safely

1. Keep the current APK until testing is complete.
2. Tap `FitHub.apk` on the Android phone.
3. Allow installation from the selected file manager if Android asks.
4. Because the package remains `com.fithub.app`, Android should offer an update when the signing identity matches. If the old APK used a different signing key, Android will require uninstalling it first; export or verify synced data before doing so.

## 10. Test checklist

- Sign in and confirm the profile loads.
- Confirm navigation order: Home, Friends, Train, Food, You.
- Confirm Back behavior and active-workout recovery.
- Create a supplement reminder, use Taken and Later, then verify calendar colour dots.
- Complete a workout, open it from workout history/calendar, reorder an exercise during another active workout, and verify a PR message.
- Confirm an eligible adult test account unlocks a major-lift Club and sees active-member count.
- Log and remove a food; add and undo water; test FatSecret search and barcode fallback.
- Toggle a specific friend's Posts and PR alerts.
- Create a challenge with a star rating and verify progress/completed history.
- Delete your own workout post.
- Test Connect Equipment on an FTMS-capable machine; verify manual tracking remains available if unsupported.
- Confirm there is no step counter or step leaderboard anywhere in the app.
