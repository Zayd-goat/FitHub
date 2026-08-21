# FitHub 1.6.9

Release date: 2026-08-21

## Train and exercise visuals

- Completed a fail-closed visual audit for all 230 catalogue exercises.
- Added dedicated male and female visual families for every exercise; no unreviewed fallback image is shown.
- Corrected equipment, cable attachments, machine types, bench angles, bar types, stance, and movement direction.
- Kept full people and equipment within the thumbnail frame.
- Female variants use fully opaque, high-coverage training clothing.
- Updated the Train landing grid to switch with the profile's selected presentation.
- Replaced fixed black/red exercise cards with the active FitHub theme colours.
- Added an automated `npm run audit:exercise-visuals` release check.
- Advanced catalogue movements are excluded from under-18 browsing; teen accounts keep technique, recovery, and coached-progress safeguards.

## Navigation and active workouts

- Android Back returns to the previous in-app page, returns non-Home tabs to Home, and only exits from Home.
- Active workouts remain recoverable while browsing other FitHub pages.
- Added a floating active-workout bar with Resume and safe delete controls.
- Exercises can be reordered or moved to the end during an active workout.

## Food and nutrition

- Added the dedicated add-food flow from each meal section.
- Added FatSecret search, barcode lookup, serving selection, recent/frequent/favourite foods, saved meals, recipes, meal copy, removal of mistaken entries, water tracking, and history/report integration.
- FatSecret client credentials remain in Supabase Edge Function secrets and are never included in the APK.
- Provider results require serving confirmation before logging and retain provider identifiers needed for licensing compliance.
- Under-18 accounts use a private meal-and-water journal without calorie targets, weight-loss goals, or punitive nutrition streaks.

## Supplements, social, clubs, and challenges

- Supplement notification actions support Taken, one-hour reschedule, and two-hour reschedule for the current day only.
- Added colour-coded supplement calendars and manual taken/missed correction.
- Added friend post/PR notification preferences, post deletion, comment deletion/moderation, and optional like/comment count hiding.
- Clubs now derive the user's highest current eligible club per supported adult lift from completed workout history and show current membership counts.
- Added challenge difficulty stars, creator attribution, monthly challenge rollover support, and completed-challenge history.

## Quality checks

- TypeScript: passed.
- Exercise visual audit: 230/230, zero pending.
- Expo Android production bundle: passed.
- Android version: 1.6.9 (`versionCode` 19).
