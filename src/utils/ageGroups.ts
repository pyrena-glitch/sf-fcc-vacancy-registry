import { AgeGroupConfig, AgeGroup } from '../types';

// California Family Child Care age group configurations
// Per CA Regulation 102416.5: only infant (under 2) has specific capacity limits
export const DEFAULT_AGE_GROUPS: AgeGroupConfig[] = [
  {
    id: 'infant',
    label: 'Infant',
    minAgeMonths: 0,
    maxAgeMonths: 24, // Under 2 years old - counts toward infant capacity limits
    color: '#f472b6', // pink
  },
  {
    id: 'non_infant',
    label: 'Non-Infant',
    minAgeMonths: 24,
    maxAgeMonths: 240, // 2+ years (no practical upper limit - school-age kids are valid)
    color: '#60a5fa', // blue
  },
];

export function getAgeInMonths(dateOfBirth: string, asOfDate: Date = new Date()): number {
  const dob = new Date(dateOfBirth);
  const years = asOfDate.getFullYear() - dob.getFullYear();
  const months = asOfDate.getMonth() - dob.getMonth();
  const dayDiff = asOfDate.getDate() - dob.getDate();

  let totalMonths = years * 12 + months;
  if (dayDiff < 0) {
    totalMonths--;
  }
  return totalMonths;
}

export function getAgeGroup(dateOfBirth: string, asOfDate: Date = new Date()): AgeGroup | null {
  const ageMonths = getAgeInMonths(dateOfBirth, asOfDate);

  for (const group of DEFAULT_AGE_GROUPS) {
    if (ageMonths >= group.minAgeMonths && ageMonths < group.maxAgeMonths) {
      return group.id;
    }
  }

  return null; // Child is too old for the program
}

export function getAgeGroupConfig(ageGroup: AgeGroup): AgeGroupConfig {
  return DEFAULT_AGE_GROUPS.find(g => g.id === ageGroup)!;
}

export function formatAge(dateOfBirth: string, asOfDate: Date = new Date()): string {
  const months = getAgeInMonths(dateOfBirth, asOfDate);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${months}mo`;
  } else if (remainingMonths === 0) {
    return `${years}y`;
  } else {
    return `${years}y ${remainingMonths}mo`;
  }
}
