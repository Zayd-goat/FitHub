# FitHub exercise visual update — production progress

This file tracks the exercise-by-exercise visual replacement work. The final
release must not claim completion until every catalogue exercise has an
approved male and female image with correct movement, equipment and angle.

## Visual standard

- One dedicated image per exercise when equipment, grip, angle or movement differs.
- Full athlete and all required equipment remain inside the thumbnail frame.
- Male and female versions use the same camera angle, equipment and movement phase.
- Female variants use opaque training clothing with complete chest coverage.
- Exercise art stays neutral; card backgrounds, borders and accent colours come from the active FitHub theme.
- An unapproved image must never be shown as a fallback for a different exercise.

## Completed dedicated pairs

- Decline Bench Press — visible declining bench; Olympic barbell and rack.
- Decline Dumbbell Press — visible declining bench; exactly two dumbbells.
- Decline Push-Up — feet elevated on a stable bench; hands on floor.
- Dumbbell Bench Press — flat bench; exactly two dumbbells; no barbell.
- Dumbbell Fly — flat bench; arms open in a fly arc with a fixed slight elbow bend; exactly two dumbbells; no barbell or pressing position.
- Incline Barbell Bench Press — clearly raised backrest; Olympic barbell in a rack; upper-chest bar path; full athlete and equipment visible.
- Assisted Pull-Up Machine — counterweighted machine with the athlete supported on the moving knee pad; full machine and athlete visible in both versions.
- Assisted Pull-Up — resistance band visibly looped over the pull-up bar and supporting the athlete; no machine knee pad.

## Train muscle-group grid

- Male profiles use the male muscle-group grid.
- Female profiles use female Chest, Back, Shoulders, Arms, Legs, Core, Full Body and Cardio artwork.
- `prefer_not_to_say` currently uses the neutral/default male grid until a neutral third visual set is produced.

## Release rule

Do not package this as the final all-exercise visual release while any exercise
still requires a dedicated replacement or visual approval.

## Navigation and meal-entry additions

- Android Back closes the deepest Food or Train screen first, then returns through recent tabs, and exits only from Home when no prior page remains.
- Back from an active workout minimizes it without deleting the timer or locally persisted workout state.
- A theme-aware workout-in-progress bar appears above the navigation outside Train and resumes the active workout when pressed.
- Breakfast, Lunch, Dinner and Snacks add buttons now open a dedicated meal-entry page instead of an inline expander.
- Meal entry includes meal switching, search, recent entries, saved meals and private custom-food entry.
- Younger accounts remain in meal-journal mode without nutrition targets, barcode tools or provider nutrition search.
- FatSecret requests continue through the Supabase Edge Function proxy; no provider credential is embedded in Android.
