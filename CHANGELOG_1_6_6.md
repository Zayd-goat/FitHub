# FitHub 1.6.6 — Exercise Visual Accuracy Update

## Train visual system

- Audited all 230 exercises in the built-in catalog.
- Added 128 movement/equipment visual families with male and female variants (256 Android-safe PNG assets).
- Corrected repeated or incorrect visuals for curl bars, cables, machines, cardio equipment, swimming, SkiErg, VersaClimber, strongman equipment, kettlebells and uncommon accessory exercises.
- Exercise images now use full-person framing with `contain` scaling to avoid cropped heads or feet.
- The selected profile gender chooses the matching exercise asset set; unspecified profiles use the male set for backward compatibility.
- Images stay consistent while Train cards, labels, borders, filters and action colors follow the active FitHub theme.
- Added explicit deterministic exercise-to-visual mapping so similarly named exercises do not accidentally share the wrong equipment.

## Verification

- 230/230 catalog exercises resolve to both gender variants.
- 0 missing visual mappings.
- TypeScript type-check passes.
- Expo Android release export passes.
- All 256 generated PNG files decode successfully and have no zero-byte files.

## Database

No Supabase migration or Edge Function deployment is required for this visual-only update.
