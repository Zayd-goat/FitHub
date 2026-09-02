# Start here — FitHub 1.6.32

FitHub 1.6.32 makes Gym Together functional and upgrades the Shared Gym, Supplement Tracker, Fitness Journey, Weekly Split and Customize FitHub interfaces.

## Choose the right download

- If your GitHub repository is already FitHub 1.6.31, use `FitHub_1.6.32_PATCH_FROM_1.6.31.zip`.
- If the repository is older, mixed, or you are unsure, use `FitHub_1.6.32_COMPLETE_UPDATE.zip`.

## Fast update path

1. Create a Git branch such as `fithub-1.6.32`.
2. Download and extract the correct zip.
3. Copy the contents of its FitHub folder into the root of your repository, preserving every supplied folder path.
4. Confirm replacements. Do not delete unrelated project files.
5. In Supabase SQL Editor, run `supabase/UPDATE_2026_09_02_FITHUB_1_6_32_ADDITIVE.sql` once.
6. Do not upload `.expo`, `node_modules`, `android`, `.env`, `google-services.json`, signing files, secrets or tokens.
7. Commit and push the branch.
8. Run **Build FitHub APK** in GitHub Actions.
9. Download the `FitHub-1.6.32-APK` artifact after the workflow succeeds.

The existing deployed `friend-notifications` Edge Function is used for immediate gym-invite and response pushes. Its code does not change in this release.

For the exact files, migration instructions and verification checklist, read `FITHUB_1_6_32_COMPLETE_UPDATE_GUIDE.md`.
