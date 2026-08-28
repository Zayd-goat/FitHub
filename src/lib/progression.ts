export type Performance = { weight_kg: number; reps: number };

// ACSM's 2009 progression position stand recommends a small load increase when
// someone can exceed the target repetition count by 1-2 reps. The newer 2026
// ACSM position stand emphasizes consistency and gradual, goal-matched progression.
export function progressionSuggestion(
  lastTwoTopSets: Performance[],
  repMin = 8,
  repMax = 12
) {
  if (lastTwoTopSets.length < 2) return 'Log this exercise twice before FitHub suggests a progression.';
  const [older, latest] = lastTwoTopSets;
  if (older.reps >= repMax + 1 && latest.reps >= repMax + 1) {
    const pct = latest.weight_kg < 20 ? 0.05 : 0.025;
    const suggested = Math.round((latest.weight_kg * (1 + pct)) * 2) / 2;
    return `You have exceeded the top of your rep range twice. Consider a small increase next time, around ${suggested} kg, while keeping good technique.`;
  }
  if (latest.reps < repMax) {
    return `Keep the same load and try to add 1 controlled rep next time, staying inside roughly ${repMin}-${repMax} reps.`;
  }
  return 'Keep this load for another session and prioritize consistent technique before increasing it.';
}
