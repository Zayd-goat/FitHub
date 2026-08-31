# Start here — FitHub 1.6.29

FitHub 1.6.29 upgrades the You, Workout, Journey, Supplements and Add Meal interfaces without replacing the 1.6.28 Home, Food or Friends work.

## Which download should I use?

- If your GitHub repository already contains FitHub 1.6.28, use `FitHub_1.6.29_PATCH_FROM_1.6.28.zip`.
- If the repository is older, mixed, or you are not sure, use `FitHub_1.6.29_COMPLETE_UPDATE.zip`.

## Fastest safe update

1. Create a new Git branch such as `fithub-1.6.29`.
2. Extract the selected ZIP on your computer.
3. Copy the extracted contents into the root of the FitHub repository.
4. Choose **Replace** when asked about matching files.
5. Do not upload `.expo`, `node_modules`, `dist-android`, `.env`, `google-services.json`, signing keys, secrets or tokens.
6. Commit and push the branch.
7. Open GitHub **Actions** and run **Build FitHub APK** (a push to `main` also starts it).
8. When the run is green, download the `FitHub-1.6.29-APK` artifact.

No SQL migration or Edge Function deployment is required for this release.

See `FITHUB_1_6_29_COMPLETE_UPDATE_GUIDE.md` for the detailed steps and exact patch file list.
