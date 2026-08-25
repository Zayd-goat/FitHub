# Exercise Visual Audit — FitHub 1.6.16

Status: PASS

## Coverage

- 230 catalogue exercises resolved at runtime.
- 472 unique exercise PNGs checked.
- 236 male and 236 female files.
- 16 muscle-group images and 2 Rest Day images checked.
- No missing mappings, orphaned PNGs, parity gaps, byte-identical duplicates, corrupt files, or pending dedicated mappings.

## Transparency cleanup

- Every exercise PNG was decoded rather than checked by filename alone.
- Detached alpha islands and edge fragments were removed across the catalogue.
- Transparent corners and meaningful transparent area are required.
- The Train UI now uses the real image alpha on light themes.
- Dark selection cards use a white image stage around the transparent figure/equipment, while the surrounding card remains theme-dark.

## T-Bar Row correction

Both `assets/train_v3/male/t_bar_row_v2.png` and `assets/train_v3/female/t_bar_row_v2.png` were replaced. Each shows an anchored landmine/T-bar, plates at the free end, a close-row handle, a hinged rowing position, and fixed red back-muscle targets.

## Reproducible check

From the project root:

```text
npm ci
npm run audit:exercise-visuals
```

The detailed hashes and runtime mapping for every file are in `reports/exercise-visual-audit.json`.

This audit validates the software assets and their catalogue assignments. It is not medical advice and does not certify a user's personal form.
