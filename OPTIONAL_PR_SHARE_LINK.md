# Optional external PR download link

FitHub 1.5.0 always includes the custom app deep link (`fithub://...`) when a PR is shared externally.

A true public "Get FitHub" fallback needs a real public URL you control, such as a Play Store listing or FitHub landing/download page. If you have one:

1. Open your GitHub FitHub repository.
2. Go to **Settings → Secrets and variables → Actions → Variables**.
3. Create a repository variable named exactly:
   `EXPO_PUBLIC_FITHUB_DOWNLOAD_URL`
4. Set its value to your real public HTTPS FitHub page.
5. Rebuild the APK.

The included `.github/workflows/build-apk.yml` passes that optional repository variable into Expo. If the variable is not set, the APK still builds and PR sharing still includes the installed-app deep link; it simply omits the public download line.
