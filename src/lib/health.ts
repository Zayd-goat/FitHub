export const kgFrom = (value: number, unit: 'kg' | 'lb') => unit === 'kg' ? value : value * 0.45359237;
export const cmFrom = (value: number, unit: 'cm' | 'in') => unit === 'cm' ? value : value * 2.54;

export function bmi(weightKg: number, heightCm: number) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

// Adult-only estimate. The original Mifflin-St Jeor study used adults and this app
// intentionally does not generate calorie/macro targets for under-18 users.
export function maintenanceCalories(
  age: number,
  weightKg: number,
  heightCm: number,
  gender: string,
  activity: string
) {
  const sexOffset = gender === 'male' ? 5 : gender === 'female' ? -161 : -78;
  const ree = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;
  const activityFactor: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725
  };
  return Math.round(ree * (activityFactor[activity] ?? 1.375));
}

export function proteinTarget(weightKg: number, goal: string) {
  // Moderate evidence-informed ranges for healthy adults who train.
  // We keep targets conservative and never provide them to under-18 users.
  const factor = goal === 'gain_muscle' || goal === 'fat_loss' ? 1.6 : 1.4;
  return Math.round(weightKg * factor);
}

export function bmiLabel(value: number) {
  if (value < 18.5) return 'below adult reference range';
  if (value < 25) return 'within adult reference range';
  if (value < 30) return 'above adult reference range';
  return 'well above adult reference range';
}
