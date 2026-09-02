# FitHub 1.6.32 validation report

Validation date: 2026-09-02

## Passed checks

- FitHub 1.6.32 shared-session and tracker audit: 17 of 17 checks passed.
- Tracker UI and younger-account safeguard audit: 17 of 17 checks passed.
- Popup and You UI audit: 12 of 12 checks passed, including seven realistic transparent assets.
- Home and Food UI audit: 60 of 60 checks passed.
- Friends UI audit: 12 of 12 checks passed.
- Source and asset references: all relative source and asset references resolved.
- Existing PNG assets: exercise, group, Home and You artwork integrity checks passed.
- Changed-screen style reference audit: Shared Gym, Supplements, Journey, Weekly Split and Customize FitHub contain no missing style references.
- Release identity: app 1.6.32, Android version code 42, iOS build 42 and APK artifact `FitHub-1.6.32-APK` are aligned.
- Package boundary: no `.expo`, `node_modules`, generated native project, deployment secret, Firebase configuration or signing credential is included.

## Functional source verification

- Gym Together inserts real `gym_invites` rows instead of local-only participants.
- Only confirmed friends from `get_my_friends` are offered in the invite picker.
- Immediate invite and accept/decline response pushes use the existing authenticated `friend-notifications` function.
- Initial invites create shared rooms and additional invites attach participants to the same room.
- Invite recipients can accept or decline; invite ownership, recipient and room-link fields are immutable to client updates.
- Android Back exits an opened shared room without closing the app.
- Removed supplement reminders are archived, and historical check-ins remain reviewable.
- Paused supplement reminders do not count as an expected routine item.
- Younger-account supplement wording remains product-neutral, includes no dose recommendation and points to appropriate adult or clinician support.
- Journey can navigate current and past weekly/monthly periods with a complete prior-period comparison window.
- Weekly Split and Customize FitHub preserve their existing data paths while replacing the layouts.

## Build-environment note

The local package did not include `node_modules`, and this workspace could not retrieve project dependencies from the npm registry. Local TypeScript compilation and Expo prebuild were therefore not claimed. The supplied GitHub workflow runs `npm ci`, `npm run typecheck`, every source/UI/asset audit, Expo prebuild and the Android release build before publishing the APK.

## Required deployment verification

- Run `supabase/UPDATE_2026_09_02_FITHUB_1_6_32_ADDITIVE.sql` before testing the new invite and reminder-removal paths.
- Keep the existing `friend-notifications` Edge Function deployed.
- Perform the two-device gym invite acceptance and decline checklist in the complete update guide.
