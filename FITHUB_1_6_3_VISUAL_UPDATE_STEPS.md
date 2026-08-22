# FitHub 1.6.3 visual update steps

## If you already completed the FitHub 1.6.2 Supabase update

No additional SQL or Edge Function deployment is required. This release changes the app interface and keeps the same backend features.

1. Extract `FitHub_1.6.3_VISUAL_REDESIGN_COMPLETE.zip`.
2. Open the included `FitHub` folder.
3. Upload everything inside it to the root of the existing GitHub repository, replacing matching files.
4. Ensure `.github/workflows/build-apk.yml`, `.gitignore` and `.env.example` are still present.
5. Commit with the message `FitHub 1.6.3 visual redesign`.
6. Open GitHub > Actions > Build FitHub APK > Run workflow.
7. Download the `FitHub-APK` artifact after the workflow succeeds.
8. Extract the artifact and install `FitHub.apk` on the phone.

## If the 1.6.2 backend update was not completed

Follow `FITHUB_1_6_2_ONE_GO_UPDATE_GUIDE.md` first, including the three additive migrations and Edge Function deployments. Then build this 1.6.3 source.

## Visual test checklist

- Home shows the plan hero, Your Week, Quick Access and friends-feed card.
- Train initially shows the two-column anatomical muscle grid.
- Selecting Chest shows only chest exercises; the back link returns to the grid.
- Existing saved and active workouts remain available.
- Food shows the date strip, diary card, four quick actions and four meal cards.
- Each meal expands/collapses and its plus button opens food search for that meal.
- Logged food can still be removed.
- Water quick add and undo work.
- Adult nutrition overview expands; a younger test account receives the meal-journal view without nutrition targets.
- Navigation and Android Back behavior still work.
