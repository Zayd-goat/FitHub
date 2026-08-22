# FitHub 1.6.11

## Home

- Rebuilt the Home screen around the supplied dark gym reference while retaining FitHub navigation and data.
- The background, borders, highlights, and cards follow the user's selected theme.
- Today's plan reads the workout split and changes the hero artwork for push, pull, legs, core, cardio, full-body, and rest days.
- Added Start Workout, Workout Details, Change Plan, and Skip to Rest actions.
- Added a weekly workout strip, Journey shortcut, Nutrition shortcut, Supplements shortcut, Community Challenges, Run Metrics, and friend activity preview.

## Train

- Rebuilt muscle selection as a two-column, light, theme-aware card grid.
- Muscle activation remains red so the anatomical target does not change with the theme.
- Male and female visual paths are selected from profile settings.
- Exercise results use consistent cards, equipment labels, target labels, search, filters, and add/remove controls.
- Added a workout preview with exercise order and equipment before starting.
- Added separate **Preview Workout** and **Start Now** actions.
- Existing active-workout recovery and the floating in-app workout bar remain available.

## Supplements

- Rebuilt the adherence calendar into a month view with previous/next navigation, Today, selected-day agenda, supplement color legend, colored event dots, and Taken/Missed/Scheduled states.
- A supplement can be marked taken for the selected day.
- Existing reminder, Taken action, one-hour/two-hour same-day rescheduling, and normal next-day schedule behavior are preserved.

## Navigation and reliability

- Android Back closes the nearest modal or deeper page before returning to the main tab behavior.
- Updated app version to 1.6.11 and Android version code to 21.
- Added an exercise-visual audit to the APK workflow.
- Confirmed TypeScript compilation and an offline Android production export.

## Exercise visual audit

- Validated 230 catalogue entries and 272 male/female PNG references.
- Confirmed PNG integrity and male/female filename parity for every referenced visual family.
- The generated report lists 100 catalogue entries that still use a reviewed visual-family mapping instead of a unique dedicated movement asset. These entries are not represented as individually audited unique illustrations.

