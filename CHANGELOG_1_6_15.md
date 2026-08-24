# FitHub 1.6.15 Changelog

Release version: 1.6.15  
Android version code: 25  
GitHub APK artifact: FitHub-1.6.15-APK

## Home

- Refined the theme-responsive Home layout to match the supplied reference structure.
- Preserved the greeting, HOME title, Today's Plan hero, weekly journey, Quick Access, and Friend Feed.
- Added the complete five-item Quick Access area: Journey, Nutrition, Supplements, Community Challenges, and Run Metrics.
- Today's Plan artwork continues to follow the user's scheduled split and selected male/female profile path.
- Added new male and female Rest Day cutouts with real alpha transparency.
- Removed the rectangular image background from Rest Day artwork.
- Increased key Home controls to accessible touch sizes.

## Train muscle groups

- Kept all eight muscle groups in a two-column, theme-responsive layout.
- Removed grey/off-white image rectangles from every group figure.
- Kept anatomical figures and red target-muscle highlights independent of theme color.
- Centered muscle-group names and exercise counts below each figure.
- Added accessible labels to every muscle-group card.
- Preserved separate male and female group artwork.

## Exercise browser

- Removed the inner grey/off-white image block from every exercise row.
- Light themes use open, clean rows with transparent exercise and equipment art.
- Dark themes retain the readable outer card while keeping the inner artwork transparent.
- Enlarged add/remove controls and equipment filters to at least 48 pixels.
- Added accessible labels to exercise rows, filters, search, and saved-workout controls.
- Preserved search, equipment filters, Repeat Last Workout, Saved Workouts, Preview Workout, and Start Now.

## Active workout

- Enlarged the transparent exercise illustration and removed the light-theme outer image/card block.
- Dark themes retain the outer workout card for contrast.
- Kept the figure and equipment transparent in every theme.
- Increased Exit, Add Exercise, Guide, set completion, rest, remove, and delete touch targets.
- Added accessible labels for the active exercise strip and major workout controls.
- Preserved the workout timer, set editing, guide, rest timer, next exercise, save, and active-workout recovery.

## Exercise visual catalogue

- Audited all 230 catalogue exercises at runtime.
- Confirmed 472 distinct referenced exercise PNGs: 236 male and 236 female.
- Confirmed 16 transparent muscle-group PNGs.
- Confirmed 2 new transparent Rest Day PNGs.
- Confirmed zero missing mappings, unresolved runtime images, orphaned exercise PNGs, parity problems, and unexpected byte-identical duplicates.
- Corrected broad-family mapping conflicts for Reverse Pec Deck and Upright Row.
- Activated dedicated artwork for Farmer's Walk, Sandbag Carries, Hip Abduction Machine, and Overhead Press.
- Strengthened the audit to decode PNG pixels and verify alpha coverage and transparent corners instead of checking file headers only.

## Compatibility

- Existing Supabase, nutrition proxy, supplements, calendar, notifications, friends, Clubs, challenges, Bluetooth FTMS, theme preferences, and workout-history behavior are preserved.
- No new Supabase migration is included.
- No existing live table should be deleted or recreated for this release.
