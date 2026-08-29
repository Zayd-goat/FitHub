# FitHub 1.6.24 Changelog

## Locked Home-preview implementation

- Rebuilt Home to follow the approved preview as the exact visual specification rather than loose inspiration.
- Kept the oversized `HOME` heading removed.
- Added the compact profile greeting, numbered notification badge and settings control.
- Added the approved Today’s Plan card with live split data, a compact Start Workout control, View Plan link and a new transparent bench/rack/barbell/shaker/towel artwork.
- Kept the existing rest-day and non-Push workout behaviour while applying the same locked card composition.
- Moved `YOUR WEEK` inside the progress card and matched the compact seven-day, current-day and completed-day states.
- Rebuilt the two summary metrics as one compact row.
- Rebuilt Quick Access as Journey/Nutrition, Supplements/Community Challenges and full-width Run Metrics with the approved proportions and refreshed native SVG icons.
- Reduced Friend Feed to the single recent activity item shown by the preview.
- Added the subtle FitHub gym-pattern background used across the approved composition.

## Navigation

- Rebuilt the five-item bottom dock to the approved slimmer rounded form.
- Added refreshed Home, Friends, Food and You SVG icons.
- Kept Train raised in a compact cyan circle with the approved white horizontal dumbbell.
- Preserved every route and the Friends request badge.

## Quality controls

- Expanded the locked Home/Food UI audit to 30 checks.
- All 728 local source and asset references resolve.
- PNG integrity passes for 472 exercise PNGs, 16 muscle-group PNGs and 2 Home PNGs.
- Exercise visual auditing passes for all 229 catalogue exercises and 236 male/236 female visual families.
- Version updated to `1.6.24`, Android version code `34`, and iOS build number `34`.

## Backend

- No SQL migration.
- No Edge Function change.
- No secret, variable or cron change.
