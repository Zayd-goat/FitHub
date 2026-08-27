# FitHub 1.6.18 Exercise Visual Audit

Audit date: 25 August 2026

## Result

| Check | Result |
|---|---:|
| Catalogue exercises | 230 |
| Referenced exercise PNGs | 472 |
| Male exercise PNGs | 236 |
| Female exercise PNGs | 236 |
| Male/female filename parity issues | 0 |
| Missing referenced files | 0 |
| Unreferenced exercise files | 0 |
| Byte-identical duplicate groups | 0 |
| Invalid exercise dimensions | 0 |
| Non-transparent exercise corners | 0 |
| Detached alpha/background artifacts | 0 |
| Muscle-group PNGs checked | 16 |
| Rest Day PNGs checked | 2 |

The machine-readable results are in `reports/exercise-visual-audit.json`.

## Full background pass

Every referenced male and female exercise image was decoded and checked. The release applied a conservative alpha cleanup to eligible pale/off-white regions while keeping real figure, clothing, equipment, muscle highlights, and antialiasing pixels. Writes were atomic so a failed conversion could not leave a partially written PNG.

The final cleanup removed 235 tiny detached remnants from 89 images. A second decoded audit then confirmed that no detached alpha/background artifacts remain.

The interface now presents the same assets consistently:

- Light themes: no separate grey/off-white image block; figure and equipment sit directly on the theme-aware exercise surface.
- Dark themes: the complete figure/equipment image sits on a clean white rounded stage for reliable contrast.
- Muscle targets: remain red regardless of selected theme.
- The same presentation rules cover male and female lists, preview, detail, live workout, exercise guide, picker, and shared plan.

## Targeted movement corrections

### T-Bar Row

- Replaced both male and female images.
- Shows an actual anchored landmine/T-bar setup with the bar pivoted at one end, a loaded rowing end, and a close T-bar handle.
- Shows a stable hip hinge and the bar being rowed toward the torso.
- Metadata now identifies `Landmine barbell / T-bar handle` and the lats, mid-back, and rear delts.

### Decline Sit-Up

- Replaced both male and female images.
- Shows the user on a decline bench with the legs secured at the higher end and the torso performing the sit-up.
- Metadata now identifies a decline bench and the rectus abdominis/hip flexors.

### Dumbbell Lateral Raise

- Replaced both male and female images.
- Shows a dumbbell in each hand, arms abducted laterally, and red lateral-deltoid targets.
- Removes the incorrect cable-machine depiction.

## Verification boundary

The automated audit proves file presence, decoded PNG integrity, dimensions, alpha behavior, parity, references, and duplicate status. Specific reported failures were visually inspected and corrected. Automated checks cannot by themselves certify perfect coaching technique or biomechanics in every illustration; qualified coaching review remains appropriate before treating any visual as instruction.
