# FitHub 1.6.32 changelog

Release date: 2026-09-02

## Gym Together

- Replaced the non-functional direct-session form with a confirmed-friend invite flow.
- Added workout name, future date, time, meeting place and optional note fields.
- Added quick choices for tomorrow, the coming weekend and common evening times.
- Gym Together now inserts a real `gym_invites` record and immediately invokes the existing notification delivery function.
- Accept and decline actions update the invite, synchronize the shared room, dismiss the acted-on notification and notify the sender.
- Session leaders can invite additional confirmed friends into the same shared workout room.
- Added Android hardware Back handling inside an opened shared room.
- Added realistic FitHub artwork, clearer privacy wording, empty states, participant status and session summaries.

## Supplement Tracker

- Rebuilt the tracker hero, calendar, daily check-in and reminder cards around the realistic FitHub artwork system.
- Improved Taken, Missed and Skipped controls, recorded-time editing and clear-status actions.
- Paused reminders are excluded from the current routine count while their history remains available.
- Removing a reminder now archives it instead of deleting its previous calendar history.
- Archived reminders appear only where their historical check-ins are relevant.
- Preserved support-led, product-neutral younger-account guidance and no-dose language.

## My Fitness Journey

- Added realistic FitHub Journey artwork and a clearer progress hero.
- Added previous/newer report navigation for weekly and monthly periods.
- Expanded the report load window so a selected monthly period can be compared with the full period before it.
- Kept private reporting, charts, comparisons, highlights and younger-account safeguards.

## Weekly Split

- Replaced the plain day list with image-led workout and recovery cards.
- Added workout-specific equipment artwork for Push, Pull, Legs, Upper, Lower, Full Body, Cardio and Rest.
- Added a visual day editor, quick choices, custom labels, clear-day control and schedule progress.

## Customize FitHub

- Reorganized the page into Appearance, Units and Features sections.
- Added a realistic FitHub customization hero and compact live theme previews.
- Added clearer system/light/dark controls, accent presets, validated HEX entry and appearance reset.
- Added easier unit selection and feature visibility switches with plain-language state descriptions.

## Data and security

- Added `supplement_reminders.archived_at`.
- Added `gym_invites.shared_session_id` for adding friends to an existing shared room.
- Updated invite-to-room synchronization for initial and additional participants.
- Made invite ownership, recipients and shared-room links immutable through client updates.
- Kept all changes additive and compatible with the existing 1.6.31 data.

## Release identity

- App version: 1.6.32
- Android version code: 42
- iOS build number: 42
- APK artifact: `FitHub-1.6.32-APK`
