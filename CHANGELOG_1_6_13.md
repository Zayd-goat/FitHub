# FitHub 1.6.13

## Home

- Rebuilt Home around the supplied reference: themed geometric background, greeting/header controls, large daily-plan hero, weekly journey, quick access, friend feed, and recent workout access.
- Kept the complete screen responsive to the user's selected FitHub theme.
- Made the hero artwork follow the scheduled split and the profile's selected exercise gender.
- Added a dedicated recovery presentation for Rest Day instead of presenting a rest day as a workout.
- Shows weekly completed sessions and active minutes without adding calorie-counting or appearance-goal features.

## Train and workout creation

- Rebuilt the muscle browser as polished two-column cards with complete adult male/female anatomical figures.
- Added eight matching group families: Chest, Back, Shoulders, Arms, Legs, Core, Full Body, and Cardio.
- Kept target-muscle overlays permanently red while card surfaces, typography, borders, and controls follow the selected theme.
- Added complete-catalogue search, equipment filters, Saved Workouts, Repeat Last Workout, and navigation-safe bottom spacing.
- Added two explicit creation choices: Preview Workout and Start Now.
- Preview supports reviewing exercise order and moving entries up or down before starting.

## Exercise visuals

- Rebuilt all 236 referenced visual families in matching adult male/female versions: 472 final PNG assets.
- Applied one consistent 768x512 pale-background anatomical instruction style to every referenced asset.
- Removed black backgrounds, mixed image styles, blank images, duplicate motion frames, partial lower frames, and edge fragments.
- Preserved exercise-specific equipment, representative movement phase, viewing angle, and fixed-red target muscles.
- Completed a 20-sheet visual review and second-pass corrections for Power Clean, Snatch, One-Arm Dumbbell Row, and Skull Crushers.

## Validation and Android

- Upgraded the visual audit to check PNG signatures, chunk bounds, chunk CRC values, IHDR/IEND completeness, trailing bytes, exact dimensions, parity, mapping coverage, and duplicate hashes.
- Updated the GitHub APK workflow to run TypeScript and visual audits before native compilation.
- Restored the safe Gradle-properties newline fix, one-worker compilation, stack traces, and APK artifact upload.
- Updated the app to version 1.6.13 and Android version code 23.

