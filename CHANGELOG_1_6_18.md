# FitHub 1.6.18 Changelog

Release date: 25 August 2026

## Home and navigation

- Refined the theme-aware Home layout to match the supplied reference structure.
- Preserved split-dependent workout artwork and a dedicated Rest Day state.
- Rebuilt the weekly card with seven day markers, workout and active-minute rings, and direct access to the workout calendar.
- Added custom Journey, Nutrition, Supplements, Community Challenges, and Run Metrics icons.
- Added a private notification center behind the Home bell.
- The bell shows no badge when the inbox is empty and shows the unread count only when needed.
- Preserved pull-to-refresh on Home and the Friends feed.
- Preserved the reference-style five-item bottom navigation and raised Train action.

## Exercise presentation and artwork

- Processed all 472 referenced exercise PNGs: 236 male and 236 female.
- Removed eligible leftover pale/off-white background regions with an atomic, conservative alpha pass.
- Preserved equipment, figure outlines, muscle highlights, and antialiasing.
- Kept muscle targets red in every app theme.
- Light themes show the figure/equipment without a separate grey image block.
- Dark themes show exercise art on a clean white rounded stage in selection, preview, detail, active-workout, guide, and shared-workout views.
- Corrected male and female Decline Sit-Up artwork with a proper decline bench and secure leg position.
- Corrected male and female Dumbbell Lateral Raise artwork with a dumbbell in each hand and lateral shoulder movement.
- Corrected male and female T-Bar Row artwork with an anchored landmine barbell, T-bar handle, loaded end, rowing posture, and back target.
- Updated exercise metadata for the corrected T-Bar Row and Decline Sit-Up equipment and target muscles.

## Birthday and age safety

- Replaced manual age entry with month/day/year birthday fields in onboarding and profile editing.
- Calculates age automatically from `date_of_birth` on every app launch.
- Synchronizes the compatibility `age` field in the database.
- Enforces the minimum account age of 13.
- Keeps calorie, macro, and activity-energy targets hidden for accounts under 18.
- Uses age-appropriate, wellbeing-focused goal choices for under-18 profiles.

## Authentication and email

- Improved email validation and account-creation messaging.
- Preserved unique email enforcement through Supabase Auth.
- Added clearer confirmation-email resend handling.
- Improved Forgot Password errors for SMTP and rate-limit failures.
- Preserved native confirmation and password-recovery deep links.
- Added branded confirmation and password-recovery HTML templates.

## Notifications and shared gym sessions

- Added the private `user_notifications` inbox with row-level security.
- Added Realtime unread counts and durable gym-invite/friend-request records.
- Added Accept/Decline controls for gym invites and friend requests.
- Opening or acting on a notification marks it read and removes it from the unread inbox.
- Acting on an Android system notification dismisses that system notification.
- Added pending-invite/request backfill in the additive migration.
- Improved the push worker to inspect Expo tickets, disable invalid device tokens, retain failures for retry, and record delivery errors.
- Preserved shared-session choice between a leader-synced workout and each participant's independent workout.

## Existing requested functions preserved

- Monthly workout calendar with manual past-workout logging, editing, and deletion.
- Supplement calendar with manual Taken/Missed/Skipped history corrections.
- Post editing with caption changes and image replace/remove.
- Workout Preview or Start Now choice, reordering, Android Back, and active-workout recovery.
- Pull-to-refresh across data-backed main screens.
- Existing Clubs, challenges, nutrition proxy, workout history, progress, Bluetooth FTMS, and theme settings.

## Release/build

- Version `1.6.18`, Android version code `28`.
- GitHub Actions artifact renamed to `FitHub-1.6.18-APK`.
- Workflow validates required Supabase, Expo, and Firebase values before building.
- Added the additive 1.6.18 Supabase migration.
