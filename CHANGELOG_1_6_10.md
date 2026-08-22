# FitHub 1.6.10

Release date: 22 August 2026

## Train and exercise visuals

- Audited all 230 exercise records against the male and female visual maps.
- Verified 426 unique PNG assets: 213 male and 213 female visual families.
- Added integrity checks for missing, duplicate, undersized, truncated, and unresolved assets.
- Kept the exercised muscle highlight red across every theme.
- Made muscle-group and exercise image containers follow the selected FitHub theme.
- Improved image containment so full exercise figures are not cropped by the card layout.
- Preserved gender-specific muscle-group and exercise imagery, including covered sportswear for female visuals.
- Kept the curated exact mappings for exercise-specific equipment, movement, and angle variants.

## Workout creation and navigation

- Added separate **Preview workout** and **Start now** actions.
- Added a workout-preview screen with exercise order, equipment, set count, and reorder controls.
- Android Back closes the preview before leaving the workout builder.
- Preserved the recoverable floating active-workout bar and existing Back hierarchy.

## Home

- Refined the focused workout hero, weekly activity card, quick-access actions, and friend preview.
- Added compact theme-aware cards for volume, weekly PRs, and age-appropriate activity information.
- Kept nutrition-energy information hidden for minors.

## Build reliability

- Added the exercise-visual audit to GitHub Actions before Android generation.
- Kept Android resource compilation to one worker and disabled release PNG crunching to avoid AAPT2 failures on the large image catalog.
- Updated the app to version `1.6.10` and Android `versionCode` to `20`.

## Database

This release requires no new Supabase tables, migration, or Edge Function. It uses the existing FitHub database baseline and previously deployed nutrition functions.
