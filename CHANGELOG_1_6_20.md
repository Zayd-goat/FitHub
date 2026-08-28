# FitHub 1.6.20 Changelog

## Interface

- Refined Home quick-access cards, spacing, icon stages, and interaction feedback.
- Replaced the global bottom navigation images with theme-aware vector icons, a stronger active indicator, larger touch targets, and a raised Train button.
- Reworked Food into a connected meal timeline with a compact action rail, clearer date control, upgraded water presentation, and consistent icons.

## Workouts

- Backdated manual workouts now accept exercises, strength sets, weights, reps, cardio duration, distance, and notes.
- Manual workout sets are stored in `workout_sets`, so valid completed history is available to Run Metrics, challenges, and adult Clubs.
- Active workout exercises can be reordered by long-pressing and dragging. **Next** and **End** shortcuts are also included.
- Reordering keeps completed/current set state and respects shared-workout leader permissions.
- Exercise guidance now covers setup, performance, breathing, common mistakes, and finishing/racking safely.

## Social and notifications

- Android Back dismisses the post editor before navigating away from Friends.
- In-app notifications support swipe-to-dismiss.
- Accept/Decline notification actions dismiss the original gym invite notification.
- The invite sender receives both an in-app and remote push response when the invite is accepted or declined.
- The existing 30-minute accepted-session reminder remains separate.

## Clubs and database

- Added an unambiguous club refresh helper and retained the public RPC contract.
- Historical completed lifts such as a 100 kg Bench Press are backfilled into the highest eligible current club.
- Added a friendly retry state instead of showing raw database errors in the Clubs interface.

## Release

- Version `1.6.20`, Android version code `30`, iOS build number `30`.
- APK artifact: `FitHub-1.6.20-APK`.
