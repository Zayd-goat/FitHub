# FitHub 1.6.16 Changelog

Release date: 24 August 2026

## Home

- Rebuilt the Home screen to match the supplied reference structure while retaining theme-driven colors.
- Added the live `TODAY'S PLAN` hero with scheduled split artwork and a dedicated Rest Day state.
- Added the seven-day `YOUR WEEK` row, workouts-completed ring, active-minutes ring, and journey link.
- Added the five requested Quick Access destinations and a two-column Friend Feed.
- Weekly cards now read completed workout sessions, including approved manual historical entries.

## Train and exercise artwork

- Removed off-white image blocks from light themes and exposed the real PNG transparency.
- Retained a clean white image stage inside dark-theme exercise-selection cards.
- Shifted muscle-group labels into a more centered lower position.
- Applied the same rendering rules to male and female paths and every theme family.
- Ran the alpha cleanup across all 472 male/female exercise PNGs.
- Replaced both T-Bar Row images with a real landmine/T-bar arrangement: anchored bar, loaded free end, close-row handle, correct rowing stance, and red upper/mid-back targets.
- Expanded the automated visual audit to decode every PNG and detect corruption, missing alpha, wrong dimensions, transparent-corner failures, detached fragments, orphaned files, duplicated files, parity failures, and runtime mapping failures.

## Historical tracking

- Added a workout-history calendar that allows today or any past day to be selected.
- Added manual completed-workout creation with title, duration, and notes.
- Added edit and delete controls only for manual workout entries.
- Recalculates workout streak data after manual entry changes.
- Rebuilt the supplement tracker as an editable calendar.
- Added Taken, Missed, and Skipped status, optional recorded time, editing, and clearing for current/past dates.
- Future manual workout and supplement entries are blocked.

## Friends and posts

- Added editing for a user's own workout-post caption.
- Added replace-photo and remove-photo actions while preserving the linked workout totals.
- Storage changes upload the replacement first and clean the old object only after a successful database update.

## Refresh and notifications

- Added pull-to-refresh to authenticated, scrollable app pages and the main Train states.
- Added remote gym-invite notifications with Accept and Decline actions.
- Added notification dismissal after a default tap or handled action.
- Supplement `TAKEN` actions save the calendar check-in and dismiss the notification.
- Gym-invite actions update only a pending invite belonging to the signed-in recipient.
- Added an outbox trigger and updated server-side notification worker.
- Added explicit Expo project-ID and Firebase Android configuration to the APK workflow so remote push setup cannot fail silently.

## Release and database

- Version: `1.6.16`
- Android version code: `26`
- Added one additive migration: `supabase/UPDATE_2026_08_24_FITHUB_1_6_16_ADDITIVE.sql`.
- Updated the GitHub artifact name to `FitHub-1.6.16-APK`.
- Preserved existing FitHub nutrition safeguards for accounts under 18.
