# FitHub 1.6.33 Journey Update

This update replaces the Fitness Journey interface from FitHub 1.6.32.

## Apply the patch

1. Back up the current FitHub project.
2. Extract FitHub_1.6.33_JOURNEY_PATCH_FROM_1.6.32.zip.
3. Copy everything inside its root folder into the root of the existing FitHub 1.6.32 project.
4. Choose Replace when Windows asks about matching files.
5. Commit and push the changes to GitHub.
6. Run the Android build workflow.
7. Download the FitHub-1.6.33-APK artifact.

Do not place the patch folder inside the project. Its src, scripts and .github folders must merge with the matching project folders.

No new Supabase SQL is required for 1.6.33. Keep the 1.6.32 migration already applied.

Do not upload .expo, node_modules, .env, google-services.json, keystores or credentials.

## Journey improvements

- Realistic 3D Journey hero matching Home and Food.
- Consolidated performance overview instead of six disconnected cards.
- Weekly and monthly report navigation.
- Interactive trend chart for workouts, minutes, sets and distance.
- Clear current-versus-previous comparison bars.
- Improved lift, exercise, PR and insight sections.
- Existing data, themes, units, privacy and account safeguards remain intact.

