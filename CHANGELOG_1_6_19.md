# FitHub 1.6.19 Changelog

Release date: 26 August 2026

## Home and navigation

- Upgraded Home to the supplied reference structure and refreshed the quick-access icon set.
- Added a compact weekly completion calendar, workout and active-minute progress, and a vertical recent-friend feed.
- Community Challenges opens the dedicated Community page.
- Run Metrics opens recorded running history and distance-specific best results.
- Removed Community Challenges from the Friends tab.

## Community, Clubs, and recorded runs

- Added top-level **Challenges** and **Clubs** tabs to the Community page.
- Preserved age gates for challenge target types, visibility, nutrition, PRs, and load-based Clubs.
- Added historical Club reconciliation from completed workout sets.
- Added exact normalized aliases for Barbell Bench Press, Barbell Back Squat, Conventional Deadlift, and Overhead Press.
- Added current-club membership counts and highest-current-tier behavior while retaining achieved milestone history.
- Added all recorded runs and dynamic 5 km multiple bests without estimating shorter splits from longer runs.

## Exercise catalogue and artwork

- Removed the duplicate Bicycle Crunches catalogue row.
- Bicycle Crunch, Bird Dog, and Crunch are bodyweight entries without a load field.
- Replaced the male Cable Crunch visual with an adult male movement asset.
- Revalidated 229 unique exercises and all 472 male/female exercise PNG references.

## Food and FatSecret

- Increased verified food search to 50 items per page.
- Added paginated Load More results, deduplication, total-result display, and provider food-detail retrieval.
- Added selectable servings and serving-count scaling.
- Added optional South Africa/English localization when the FatSecret application has the required scope.
- Added account-scope-aware barcode lookup with a clear setup error if barcode access is not enabled.

## Gym-invite notifications

- A signed-in sender asks the server to process a new invite immediately.
- The server verifies that the caller created the invite before accessing the private outbox.
- Immediate in-app delivery is retained through the database trigger.
- The unified cron worker remains a retry/fallback for offline devices or temporary push failures.
- A 30-minute reminder is scheduled only after acceptance and is restored when accepted sessions reload.
- Accepting through the in-app center or notification action schedules the accepted-session reminder too.

## Release and validation

- Version moved to 1.6.19, Android version code 29, and iOS build number 29.
- Added dependency-free source-reference and PNG asset audits.
- Updated the GitHub Actions artifact to `FitHub-1.6.19-APK`.
