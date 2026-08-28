# FitHub 1.6.17 Exercise Visual Audit

Validation date: 25 August 2026

## Result

- Catalogue exercises: 230
- Runtime-resolved exercises: 230
- Male exercise PNGs: 236
- Female exercise PNGs: 236
- Unique male/female exercise PNGs: 472
- Muscle-group PNGs: 16
- Production Rest Day PNGs: 2
- Runtime mapping issues: 0
- Gender parity issues: 0
- Missing/orphaned exercise assets: 0
- Pending dedicated exercise visuals: 0
- Unexpected byte-identical duplicate groups: 0

The 1.6.17 source does not replace the verified 1.6.16 artwork. All 492 relevant source hashes match the verified baseline, and an independent image decode confirmed that all 490 production exercise/group/rest files have transparent corners.

## Presentation checks added in 1.6.17

- Light themes render the transparent PNG directly without an off-white image block.
- Dark themes use a clean white rounded image stage so figures and equipment remain legible.
- The rule now applies consistently in exercise lists, previews, details, active workouts, movement guides, and shared workout planning.
- Male and female paths use the same layout rules.
- T-Bar Row retains the corrected anchored landmine/T-bar setup from 1.6.16.

The machine-readable report remains `reports/exercise-visual-audit.json`. GitHub Actions regenerates it with the 1.6.17 audit script during the release build.
