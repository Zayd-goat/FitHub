# FitHub 1.6.8

## Train and exercise visuals

- Added gender-aware Train artwork and muscle-group presentation.
- Added distinct, reviewed male and female visuals for corrected chest and back movements, including decline presses, dumbbell bench press, cable-fly directions, pec deck, weighted push-up, assisted pull-up variants, machine rows, Pendlay row, one-arm dumbbell row, straight-arm pulldown, barbell/dumbbell shrugs, chest-supported row, chin-up, and medicine-ball throw.
- Female exercise artwork uses opaque, high-coverage athletic clothing with the chest fully covered.
- Exercise cards use the selected FitHub theme; artwork remains neutral and reusable across themes.
- Unverified exercise-to-art matches fail closed instead of showing a knowingly incorrect movement or piece of equipment.

## Navigation and active workouts

- Android Back returns to the previous deeper screen, returns non-Home main tabs to Home, and exits from Home on the next Back action.
- Active workouts remain recoverable through the floating in-app workout bar.
- Exercises can be reordered while a workout is active.

## Food and nutrition

- Meal sections open the dedicated food finder for search, recent foods, favourites, saved meals, custom foods, serving selection, and confirmation before logging.
- Food diary supports removal of mistaken entries and water tracking.
- FatSecret requests remain server-side through Supabase Edge Functions; provider secrets are not included in the Android project.
- Teen accounts keep nutrition targets, barcode/provider lookup, and calorie-focused behaviour restricted.

## Social, clubs, supplements, and challenges

- Preserved workout posts, ownership-based deletion, comment controls, like/comment count privacy, friend post/PR notification preferences, challenges, Clubs, themes, and feature hiding.
- Supplement reminders support Taken and one-day rescheduling while preserving the normal schedule for following days.
- Supplement and workout calendars remain available.

## Build

- App version: `1.6.8`; Android version code: `18`.
- TypeScript check passed.
- Expo Android production bundle export passed.
- Exercise-asset PNG/parity audit passed; the audit report records both reviewed and intentionally fail-closed catalogue entries.

