# FitHub 1.6.2 — complete queued update

FitHub 1.6.2 is built additively on the already-applied 1.5.0 database baseline.

## Navigation and interface

- Added the approved five-destination navigation: Home, Friends, Train, Food and You.
- Made Train the raised central primary action while keeping every label visible.
- Added a clear active destination indicator and a live pending-friend-request badge.
- Refined Home into a calmer gym dashboard and removed recent-workout and Clubs blocks from Home.
- Added muscle-group-first training discovery with exercise details after selection.
- Refined Food, Friends and Challenges into clearer card-based pages.

## Supplements and calendars

- Custom reminders, common quick-add labels, local daily time and notification on/off.
- Taken and Later actions in notifications; Later reschedules within the same day.
- In-app Taken toggle for missed notification interactions.
- Monthly adherence calendar with a user-selected colour per supplement.
- No dosage recommendations; younger-account safety copy remains enforced.

## Training, PRs, clubs and posts

- Exact PR improvement text, confetti, internal sharing and external sharing.
- Major-lift Clubs unlock automatically from completed-workout PR data.
- Clubs only shows the user's unlocked clubs and current active-member counts.
- Completed-workout calendar and drill-down into the recorded workout.
- Exercises can move up, down, next or last during an active workout.
- Users can delete their own workout posts while private workout history remains.
- Shared-session publishing continues to require participant consent.

## Food and nutrition

- Private meal diary with meal sections, calories, protein, carbohydrates, fat and fibre.
- FatSecret OAuth 2.0 calls remain behind the Supabase nutrition proxy; no provider secret is stored in the APK.
- Search, barcode lookup, recent/history views, custom food, serving metadata, saved meals, recipes and copy-yesterday support.
- Logged foods and water entries can be removed when entered incorrectly.
- Added quick water intake and daily totals.
- Assisted photo/natural-language entries remain confirmation-first architecture only.
- Under-18 accounts retain the safer meal-journal experience without calorie targets or restrictive coaching.

## Friends and challenges

- Per-friend post and PR notification preferences.
- One-to-five-star challenge difficulty selected by the creator.
- Official monthly challenge fields and archive support.
- Challenge creator, progress, status and completed-challenge history.

## Cardio and platform behavior

- FTMS Bluetooth discovery for compatible equipment, permissions, reconnect/lost state and manual fallback.
- Machine-reported values remain separate from FitHub estimates.
- Android Back: deeper page to previous/main page, non-Home tab to Home, Home back exits.
- Active workouts remain recoverable and keep their notification/timer state.
- Step counter and step leaderboard are retired from the app UI and writes; historical server rows are retained to avoid destructive data loss.

## Build

- Version 1.6.2, Android versionCode 12.
- Restored GitHub Actions APK workflow and moved the project runtime to Node 22 LTS.
- TypeScript validation passes.
