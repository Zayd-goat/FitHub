# FitHub 1.6.0

## Added
- Server-only FatSecret OAuth 2.0 nutrition proxy with South Africa localization request, pagination,
  barcode lookup architecture and provider-ID storage boundaries.
- Additive private nutrition schema: meal categories, fibre, favourites, saved meals, recipes, water,
  idempotent offline writes and user-selected goals.
- Android hardware pedometer screen and private daily history; step-group and membership schema.
- Consent-gated shared gym sessions and joint post data model.
- Bluetooth FTMS discovery/connect states and manual fallback; complete machine metric storage model.
- Rule-based activity streak storage. Opening FitHub no longer extends a streak.
- Android Back routing: detail to prior/main, non-Home tab to Home, Home Back exits.
- Version 1.6.0 / Android versionCode 9 and required sensor, camera and Bluetooth permissions.

## Preserved and integrated from 1.5.0
- Supplement reminders, PR celebration/share, Journey reports, split prompt, Clubs, challenges,
  six theme families, accent colours, measurement settings and feature hiding.
- Existing auth, profiles, workouts, notifications, cardio, PR graphs, friends feed and immersive UI.

## Safety and privacy
- Under-18 accounts remain a neutral meal journal: calorie/macro targets, online nutrition search and
  load-based Clubs remain hidden. No restrictive-eating achievements or supplement encouragement.
- Food diary and step data are private by default. Shared workout publication requires consent.
- Machine calories and FitHub estimates are stored with distinct source labels.

## Validated
- npm dependency install completed.
- Strict TypeScript application check passes. Supabase Deno functions are checked/deployed separately.
- Physical pedometer, barcode camera and FTMS testing still require a real Android build/device.
