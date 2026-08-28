export type AgeProfile = {
  age?: number | null;
  date_of_birth?: string | null;
};

export type BirthDateParts = {
  year: string;
  month: string;
  day: string;
};

const ISO_BIRTH_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function localDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function calculateAge(dateOfBirth?: string | null, today = new Date()) {
  const match = String(dateOfBirth ?? '').match(ISO_BIRTH_DATE);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = localDate(year, month, day);
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day ||
    birth.getTime() > today.getTime()
  ) return null;

  let age = today.getFullYear() - year;
  const birthdayHasPassed = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayHasPassed) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

export function profileAge(profile?: AgeProfile | null) {
  const calculated = calculateAge(profile?.date_of_birth);
  if (calculated != null) return calculated;
  const stored = Number(profile?.age);
  return Number.isInteger(stored) && stored >= 0 && stored <= 120 ? stored : null;
}

export function splitBirthDate(dateOfBirth?: string | null): BirthDateParts {
  const match = String(dateOfBirth ?? '').match(ISO_BIRTH_DATE);
  return match ? { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) } : { year: '', month: '', day: '' };
}

export function validateBirthDate(parts: BirthDateParts, today = new Date()) {
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { iso: null, age: null, error: 'Enter a complete birthday.' } as const;
  }
  const date = localDate(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { iso: null, age: null, error: 'Enter a real calendar date.' } as const;
  }
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const age = calculateAge(iso, today);
  if (age == null || age < 13) return { iso: null, age, error: 'FitHub accounts require a minimum age of 13.' } as const;
  if (age > 100) return { iso: null, age, error: 'Check the birth year and try again.' } as const;
  return { iso, age, error: null } as const;
}

export function formatBirthDate(dateOfBirth?: string | null) {
  const match = String(dateOfBirth ?? '').match(ISO_BIRTH_DATE);
  if (!match) return '—';
  const date = localDate(Number(match[1]), Number(match[2]), Number(match[3]));
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
