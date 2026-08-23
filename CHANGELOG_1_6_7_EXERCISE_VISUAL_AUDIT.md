# FitHub 1.6.7 — Exercise Visual Accuracy Guard

## What changed

- Audits all 230 catalogue entries and every male/female PNG reference.
- Verifies PNG signatures, minimum dimensions, missing files and gender parity.
- Removes silent “closest movement” presentation for exercises that do not yet have an exact approved asset.
- Prevents incorrect equipment, bench angle or movement from being shown as an exact demonstration.
- Keeps approved exercise images gender-aware from the profile setting.
- Makes Train thumbnails use active theme surfaces instead of a hard-coded black background.
- Adds `npm run audit:exercise-visuals` and writes `reports/exercise-visual-audit.json`.

## Important accuracy rule

If the exact exercise-to-image match has not been approved, FitHub now shows a themed category marker instead of a misleading movement image. This is intentional: no image is safer than an image showing the wrong bar, machine, bench angle or movement.

## Database

No Supabase migration or Edge Function deployment is required for this visual-only update.
