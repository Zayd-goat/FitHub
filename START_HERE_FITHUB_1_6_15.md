# FitHub 1.6.15 — Start Here

Use FITHUB_1_6_15_STEP_BY_STEP_UPDATE_GUIDE.md for the complete installation instructions.

## Short answer

- Yes: you may replace the repository's assets, src, scripts, and supabase folders with the matching folders from the 1.6.15 ZIP.
- Replacing the repository's supabase folder does **not** delete or reset the live Supabase database.
- Do **not** delete the repository's .git folder, GitHub secrets, live Supabase project, tables, or production data.
- Do **not** upload node_modules, android, a generated dist-* folder, an APK, or your private .env.
- No command-prompt command and no new Supabase SQL migration are required for this update.

## Recommended route

1. Extract FitHub_1.6.15_COMPLETE_UPDATE.zip.
2. Use GitHub Desktop to copy the extracted project contents into the local repository and replace matching files.
3. Commit with: FitHub 1.6.15 complete update.
4. Push to main.
5. Run **Actions → Build FitHub APK → Run workflow**.
6. Download the FitHub-1.6.15-APK artifact.

The correct exercise-image paths are:

    assets/train_v3/male/
    assets/train_v3/female/

They must not become assets/train_v3/train_v3, male/male, or loose PNG files in the repository root.
