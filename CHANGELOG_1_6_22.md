# FitHub 1.6.22 Changelog

## Home

- New responsive Home implementation in `DashboardTabV2.tsx`.
- Clear Today’s Plan hero with workout/recovery action and plan details.
- Flexible seven-day calendar that retains readable dates and state markers on narrow phones.
- Contained workout and active-time metrics with values that do not split across lines.
- Two-column Quick Access cards with a two-line Community Challenges limit.
- Full-width Run Metrics card and rebuilt Friend Feed.
- Additional bottom clearance so the navigation dock cannot cover the final feed row.

## Food

- New visual hierarchy: diary summary, primary add/search action, shortcuts, meals, Water, then Nutrition.
- Full-width meal cards replace the old side timeline.
- Larger expand, add, overflow, Back, and close targets.
- New meal, journal, food search, barcode, recent, saved, water, and Nutrition icons.
- Online nutrition search, barcode scanning, and numeric targets remain unavailable to younger accounts.
- Added lower-page clearance so Water and Nutrition remain fully reachable.

## Icon and navigation system

- Added `FitHubFreshIcons.tsx` with 35 original SVG icon components.
- Home, Food, active-workout affordance, and all five bottom-navigation destinations now use the new system.
- Bottom navigation uses a consistent active pill and a less obstructive raised Train button.

## Quality controls

- Added `npm run audit:home-food-ui` with 20 release checks.
- GitHub Actions now runs source references, exercise visuals, Home/Food safeguards, and PNG integrity before Android generation.
- Replaced the unsupported `StyleSheet.absoluteFillObject` reference with explicit absolute positioning for React Native 0.86 TypeScript compatibility.
- Version updated to `1.6.22`, Android version code `32`, and iOS build number `32`.

## Backend

- No SQL migration.
- No Edge Function change.
- No new secret or GitHub variable.
