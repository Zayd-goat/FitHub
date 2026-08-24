# FitHub

FitHub 1.6.16 is an Expo/React Native fitness app using the supplied FitHub artwork as the Android/iOS app icon. The project includes:

- email/password sign-up and sign-in
- automatic Supabase confirmation email flow
- first-login fitness onboarding
- adult BMI and maintenance-calorie estimate
- adult protein target
- food/macro logging with common foods, custom foods and optional USDA FoodData Central search
- workout logging for machine, free-weight, bodyweight and cardio exercises
- illustrated exercise cards plus custom exercises
- evidence-guided progressive-overload suggestions
- login and workout streaks
- friends by username or exact email
- cross-device friend streaks, workout feed and comments
- group challenges, preset challenges and custom challenges
- achievements, tokens and profile pictures
- GitHub Actions APK build workflow

> Safety note: FitHub intentionally does not generate calorie or macro targets for accounts under 18. Those accounts can still use the training, friends, challenge, streak and badge features.

## 1. Create the Supabase backend

1. Create a new project at Supabase.
2. In **SQL Editor**, create a new query.
3. Paste everything from `supabase/schema.sql` and click **Run**.
4. Go to **Authentication → Providers → Email** and keep email/password enabled.
5. Turn on **Confirm email** so new accounts must verify their address.
6. Configure **custom SMTP** in **Authentication → SMTP Settings** if real users outside your Supabase team will sign up. This is also the safest way to ensure branded confirmation emails can be customized and delivered in production.
7. Go to **Authentication → Email Templates → Confirm signup**.
8. Use a subject such as `Welcome to FitHub — confirm your account`.
9. Paste the HTML from `supabase/confirmation-email.html` into the confirmation template and save it.

The database trigger saves every new account into the FitHub `profiles` table automatically. The confirmation email thanks the person for joining and gives them the verification link. On current Supabase free projects, the default mail service has restrictions, so use custom SMTP for real sign-ups.

## 2. Configure online USDA food search

USDA requires an API key and says API keys should not be exposed publicly, so FitHub keeps it in a Supabase Edge Function instead of putting it inside the APK.

1. Request a data.gov API key for USDA FoodData Central.
2. Install the Supabase CLI on your computer and log in.
3. From this project folder, link your project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

4. Store the USDA key as a Supabase secret:

```bash
supabase secrets set USDA_API_KEY=YOUR_DATA_GOV_KEY
```

5. Deploy the included function:

```bash
supabase functions deploy food-search
```

If you skip this step, built-in foods and manual food entry still work; only the online USDA search button will be unavailable.

## 3. Add the mobile app environment variables

In Supabase go to **Project Settings → API** and copy:

- Project URL
- Publishable key (or anon key if your project still labels it that way)

For local development, copy `.env.example` to `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_KEY
```

Never put the Supabase service-role key in the app.

## 4. Test the app locally

Install Node.js 22 LTS, then from the project folder run:

```bash
npm install
npx expo start
```

You can open it in an Android emulator/device. For a native local Android build:

```bash
npx expo run:android
```

## 5. Put the project on GitHub

1. Create a new empty GitHub repository, for example `FitHub`.
2. Extract this project and open a terminal inside the `FitHub` folder.
3. Run:

```bash
git init
git add .
git commit -m "Initial FitHub app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/FitHub.git
git push -u origin main
```

## 6. Add GitHub repository secrets

On GitHub open:

**Repository → Settings → Secrets and variables → Actions → New repository secret**

Create these secrets:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GOOGLE_SERVICES_JSON_BASE64` (required for Android remote push notifications)

Create this repository variable:

- `EXPO_PUBLIC_EXPO_PROJECT_ID`

Use the same values from Step 3.

## 7. Build the APK with GitHub Actions

The included workflow is `.github/workflows/build-apk.yml`.

1. Open your GitHub repository.
2. Click **Actions**.
3. Select **Build FitHub APK** in the left panel.
4. Click **Run workflow** → **Run workflow**.
5. Wait for the green check mark.
6. Open that completed workflow run.
7. Scroll to the **Artifacts** section at the bottom of the run page.
8. Click **FitHub-1.6.16-APK**.
9. GitHub downloads a zip containing `FitHub.apk`.
10. Extract the zip, send `FitHub.apk` to your Android phone and install it. Android may ask you to allow installation from that source.

The GitHub workflow deliberately uses **Node 22 LTS** and `actions/upload-artifact@v4`, and it explicitly copies the generated APK to `FitHub.apk`, so an **Artifacts** section is created when the build succeeds.

### What kind of APK is this?

The GitHub workflow builds an Android **debug-signed APK**. It is directly installable and ideal for testing and sharing privately. For Google Play, build a release `.aab` with proper signing instead.

## 8. Optional: make a signed EAS preview APK

The included `eas.json` has a `preview` profile with `android.buildType: "apk"`.

After installing EAS CLI and logging into Expo:

```bash
npx eas-cli@latest build -p android --profile preview
```

Expo can manage the Android signing credential and gives you an installable APK link when the build finishes.

## App architecture

- `App.tsx` — authentication/profile gate
- `src/screens/AuthScreen.tsx` — sign in/create account
- `src/screens/OnboardingScreen.tsx` — first-login fitness questions
- `src/screens/MainApp.tsx` — persistent maintenance-calorie header + tab shell
- `src/screens/tabs/FoodTab.tsx` — food and macro logging
- `src/screens/tabs/WorkoutTab.tsx` — exercise library, custom exercises, logging and progression suggestions
- `src/screens/tabs/FriendsTab.tsx` — friends, workout feed, comments and challenges
- `src/screens/tabs/ProfileTab.tsx` — profile picture, targets and evidence links
- `supabase/schema.sql` — database, RLS policies, realtime-safe shared data and RPC functions
- `supabase/functions/food-search/` — server-side USDA search proxy
- `assets/icon.png` — the exact image supplied for the FitHub icon

## Evidence used inside FitHub

The app links to the following sources from the profile screen:

- CDC adult BMI calculator / BMI guidance
- NIDDK Body Weight Planner
- Mifflin–St Jeor resting-energy equation
- ACSM 2026 resistance-training position stand
- ACSM progression guidance
- a resistance-training protein meta-analysis
- USDA FoodData Central

FitHub's training suggestion is deliberately modest: when a person repeatedly exceeds the top of their target rep range, it suggests a small load increase; otherwise it suggests holding the load and adding a controlled rep. The app treats these as suggestions, not medical or coaching instructions.
