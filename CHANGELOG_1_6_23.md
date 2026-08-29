# FitHub 1.6.23 Changelog

## Home reference implementation

- Rebuilt the Home surface as native React Native components using the approved reference as the locked visual specification.
- Removed the oversized `HOME` heading so the screen begins with the profile greeting, notification control and settings control.
- Added the approved Today’s Plan composition with a transparent bench, rack, loaded barbell and shaker asset for Push/chest sessions.
- Retained live scheduled-workout names, rest-day artwork and working Start Workout/View Plan navigation.
- Rebuilt Your Week with the approved seven-day states and compact workout/active-minute summary.
- Rebuilt Quick Access as Journey/Nutrition, Supplements/Community Challenges and a full-width Run Metrics destination.
- Kept the working Friend Feed below Quick Access.

## Food reference implementation

- Rebuilt the visible Food diary as native, interactive components using the supplied Food reference as the locked specification.
- Added the exact header hierarchy, seven-day strip and diary copy: `Keep your meals organised in one place`.
- Removed the rejected extra search banner.
- Added the exact Search, Scan, Recent and Saved Meals shortcut row.
- Added the cyan side timeline with illustrated Breakfast, Lunch, Dinner and Snacks cards.
- Meal cards begin collapsed like the reference and retain expand, add, remove, copy-yesterday and save-meal behaviour.
- Added the approved Water composition with droplet heading, bottle illustration, six glasses and teal add control.
- Preserved Food search, barcode scan, saved meals, food history, custom foods, water logging and Android Back behaviour.

## New FitHub icon and navigation system

- Added `FitHubReferenceIcons.tsx` with 32 purpose-built, theme-aware SVG components.
- Replaced all visible Home, Food and bottom-navigation icons with the new coherent system.
- Added the approved floating teal Train button with a clean white horizontal dumbbell.
- Preserved Home, Friends, Train, Food and You routes and the Friends request badge.

## Quality controls

- Expanded `npm run audit:home-food-ui` to 25 locked-reference, accessibility, routing and account-safeguard checks.
- Strict TypeScript compilation passes.
- All 728 local source and asset references resolve.
- PNG and exercise visual audits pass.
- Version updated to `1.6.23`, Android version code `33`, and iOS build number `33`.

## Backend

- No SQL migration.
- No Edge Function change.
- No new secret, variable or cron job.
