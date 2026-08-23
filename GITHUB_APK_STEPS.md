# FitHub: GitHub → APK steps

1. Create your Supabase project and run `supabase/schema.sql`.
2. Turn on email/password auth + confirm email. Configure custom SMTP for real users, then paste `supabase/confirmation-email.html` into the confirm-signup template.
3. Push this entire FitHub folder to a GitHub repository.
4. In GitHub open **Settings → Secrets and variables → Actions**.
5. Add `EXPO_PUBLIC_SUPABASE_URL`.
6. Add `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
7. Open the **Actions** tab.
8. Click **Build FitHub APK**.
9. Click **Run workflow**.
10. Wait for the run to finish with a green check.
11. Open the completed run and scroll to **Artifacts**.
12. Click **FitHub-APK**.
13. Extract the downloaded zip; it contains `FitHub.apk`.
14. Move `FitHub.apk` to an Android phone and install it.

The workflow is already included at `.github/workflows/build-apk.yml` and uses Node 24, Android API 36, Java 17, Gradle caching and `actions/upload-artifact@v4`.

For Google Play, use a properly signed release AAB rather than the debug APK produced by this workflow.
