# FitHub 1.3.0

## Added
- Realistic cardio artwork for treadmill, outdoor running/walking, cycling, rowing, elliptical, StairMaster, SkiErg, jump rope, VersaClimber and swimming.
- Friends gym-session invites with date, time, optional gym/workout/message and accept/decline/cancel states.
- 30-minute local reminders for accepted gym sessions.
- Optional workout-photo sharing after a completed workout; keeping a workout private remains available.
- Persistent active-workout state: elapsed time is calculated from the original start timestamp and restores after the app is reopened.
- Sticky Android active-workout notification with workout name, current exercise and elapsed time while the app process is running; it remains until the workout is finished or explicitly deleted.
- PR analytics graphs with exercise switching.
  - Strength: Weight on the X-axis and reps on the Y-axis.
  - Distance cardio: time on the X-axis and distance on the Y-axis.
  - Time-only cardio: session number on the X-axis and duration on the Y-axis.

## Changed
- Workout posts are no longer automatically shared. After completion the user chooses Keep private, Post stats, or Add photo & post.
- Workout photos are stored in a private Supabase bucket and viewed through short-lived signed URLs.
- Friends now has Feed, Following, Invites and Challenges tabs.
- FitHub app version is now 1.3.0 with Android versionCode 6.

## Dependencies
- Added `expo-notifications` ~57.0.10.
- Added `react-native-svg` 15.15.4.
- Updated `expo-image-picker` to ~57.0.9.
