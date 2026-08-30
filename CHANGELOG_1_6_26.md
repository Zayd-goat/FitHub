# FitHub 1.6.26 Changelog

## Food interface

- Rebuilt the Food diary to match the user-approved preview.
- Added a theme-aware, low-contrast gym-pattern background.
- Added a new diary hero scene combining a meal-prep box, training bottle and checklist.
- Changed the diary guidance to `Plan your meals and hydration`.
- Refined the seven-day selector, cards, spacing, typography and shadows.
- Increased meal and water action targets to 48–50 dp.

## New custom icon system

- Added 15 original SVG components in `src/components/FitHubFoodIcons.tsx`.
- Replaced the old visible Food diary icons with new Search, Scan, Recent, Saved Meals, Breakfast, Lunch, Dinner, Snacks and Water artwork.
- Made icon outlines, fills and surfaces respond to FitHub themes and custom accent colours.

## Preserved behaviour

- Food search, barcode scanning, saved meals, recent history, meal expansion, add/remove actions, water tracking and pull-to-refresh remain connected to their existing logic.
- Existing under-18 safeguards remain active.
- No database schema, Edge Function, notification, FatSecret credential or Supabase configuration change is included.

## Release identity

- App version: `1.6.26`
- Android version code: `36`
- iOS build number: `36`
- GitHub artifact: `FitHub-1.6.26-APK`
