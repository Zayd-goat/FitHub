# FitHub 1.6.25 Validation Report

## Passed locally

- Release identity aligns at app `1.6.25`, Android version code `35`, iOS build number `35` and APK artifact `FitHub-1.6.25-APK`.
- All 721 relative source and asset references resolve across 51 source files.
- The expanded 49-check Home, Food and Community UI audit passes.
- The Home audit confirms the approved 1.6.24 composition is retained.
- Dedicated Pull, Legs, Upper, Full Body, Cardio, Shoulders, Arms, Core and Recovery equipment assets are present and referenced.
- PNG integrity passes for 472 exercise PNGs, 16 muscle-group PNGs and 12 Home PNGs.
- All ten Home equipment assets are 1402 × 1122 RGBA PNGs with transparent corners.
- The exercise visual audit passes for 229 catalogue exercises, 472 PNG references and 236 male/236 female visual families.
- Challenges retain workout-history progress, invitation accept/decline and joining.
- Clubs retain historical refresh/backfill, unit formatting, current highest milestones and member counts.
- Under-18 accounts retain consistency-based challenge limits and do not receive load-based Clubs.

Generated reports:

```text
reports/home-food-ui-audit.json
reports/png-asset-audit.json
reports/exercise-visual-audit.json
```

## Build validation still required

This workspace has no installed npm dependency tree and network package installation is unavailable, so strict TypeScript and Expo/Metro bundling remain assigned to the supplied GitHub workflow.

GitHub Actions must pass dependency installation, TypeScript, every audit, Android prebuild and the release APK build before installation.

## Physical-device testing still required

- Inspect all ten Home workout-plan scenes in light, dark and custom themes.
- Test Community Back navigation, both tabs, four challenge filters and all creator steps.
- Test challenge join, invitation accept/decline, progress refresh and completion.
- Test Club backfill, normalized lifts, kg/lb display, current milestones and active-member counts.
- Test adult and under-18 accounts separately.
- Test narrow Android widths, increased font size, pull-to-refresh, empty data, long data, offline and error states.

## Deployment note

FitHub 1.6.25 adds no SQL migration, Edge Function, secret or cron change.
