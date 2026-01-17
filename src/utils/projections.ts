import { Child, ProjectedOpening, AgeGroup, CapacityConfig, Vacancy } from '../types';
import { DEFAULT_AGE_GROUPS, getAgeGroup } from './ageGroups';
import { getMaxInfantsAllowed } from './compliance';
import { addMonths, format } from 'date-fns';

// Calculate when a child will transition to the next age group
function getAgeTransitionDate(dateOfBirth: string, targetAgeMonths: number): Date {
  const dob = new Date(dateOfBirth);
  return addMonths(dob, targetAgeMonths);
}

// Get the kindergarten start date (typically September of the year they turn 5)
function getKindergartenStartDate(dateOfBirth: string): Date {
  const dob = new Date(dateOfBirth);
  // Child typically starts kindergarten in September of the year they turn 5
  // Cutoff is usually September 1st, so if born before Sept 1, they start that year
  const birthMonth = dob.getMonth();
  const birthDay = dob.getDate();

  let kindergartenYear = dob.getFullYear() + 5;

  // If born on or after September 1st, they start the following year
  if (birthMonth > 8 || (birthMonth === 8 && birthDay >= 1)) {
    kindergartenYear++;
  }

  return new Date(kindergartenYear, 8, 1); // September 1st
}

export function calculateProjectedOpenings(
  children: Child[],
  projectionMonths: number = 12
): ProjectedOpening[] {
  const openings: ProjectedOpening[] = [];
  const today = new Date();
  const projectionEnd = addMonths(today, projectionMonths);

  for (const child of children) {
    const childName = `${child.firstName} ${child.lastName}`;

    // Check for scheduled departure
    if (child.expectedDepartureDate) {
      const departureDate = new Date(child.expectedDepartureDate);
      if (departureDate >= today && departureDate <= projectionEnd) {
        const currentAgeGroup = getAgeGroup(child.dateOfBirth, departureDate);
        if (currentAgeGroup) {
          openings.push({
            date: child.expectedDepartureDate,
            ageGroup: currentAgeGroup,
            reason: 'scheduled_departure',
            childId: child.id,
            childName,
          });
        }
      }
      continue; // Skip other projections if departure is scheduled
    }

    // Check for kindergarten transition
    const kStartDate = getKindergartenStartDate(child.dateOfBirth);
    if (kStartDate >= today && kStartDate <= projectionEnd) {
      openings.push({
        date: format(kStartDate, 'yyyy-MM-dd'),
        ageGroup: 'non_infant',
        reason: 'kindergarten',
        childId: child.id,
        childName,
      });
      continue; // Skip age transitions if going to kindergarten
    }

    // Check for aging out (reaching max age of program - 6 years)
    const maxAgeGroup = DEFAULT_AGE_GROUPS[DEFAULT_AGE_GROUPS.length - 1];
    const agingOutDate = getAgeTransitionDate(child.dateOfBirth, maxAgeGroup.maxAgeMonths);
    if (agingOutDate >= today && agingOutDate <= projectionEnd) {
      openings.push({
        date: format(agingOutDate, 'yyyy-MM-dd'),
        ageGroup: 'non_infant',
        reason: 'aging_out',
        childId: child.id,
        childName,
      });
      continue;
    }

    // Check for infant -> non-infant transition (turning 2)
    const infantGroup = DEFAULT_AGE_GROUPS[0];
    const transitionDate = getAgeTransitionDate(child.dateOfBirth, infantGroup.maxAgeMonths);

    if (transitionDate >= today && transitionDate <= projectionEnd) {
      const currentAgeGroup = getAgeGroup(child.dateOfBirth, today);
      if (currentAgeGroup === 'infant') {
        openings.push({
          date: format(transitionDate, 'yyyy-MM-dd'),
          ageGroup: 'infant',
          reason: 'aging_into_next_group',
          childId: child.id,
          childName,
        });
      }
    }
  }

  // Sort by date
  openings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return openings;
}

export function calculateCurrentVacancies(
  children: Child[],
  capacityConfig: CapacityConfig
): Vacancy[] {
  const today = new Date();
  const counts: Record<AgeGroup, number> = {
    infant: 0,
    non_infant: 0,
  };

  for (const child of children) {
    const ageGroup = getAgeGroup(child.dateOfBirth, today);
    if (ageGroup) {
      counts[ageGroup]++;
    }
  }

  const totalEnrolled = counts.infant + counts.non_infant;
  const maxInfants = getMaxInfantsAllowed(capacityConfig.programType, totalEnrolled);

  return [
    {
      ageGroup: 'infant',
      currentCount: counts.infant,
      capacity: maxInfants,
      available: maxInfants - counts.infant,
    },
    {
      ageGroup: 'non_infant',
      currentCount: counts.non_infant,
      capacity: capacityConfig.totalCapacity - counts.infant,
      available: capacityConfig.totalCapacity - totalEnrolled,
    },
  ];
}

export function getNextOpeningByAgeGroup(
  projections: ProjectedOpening[],
  ageGroup: AgeGroup
): ProjectedOpening | null {
  return projections.find(p => p.ageGroup === ageGroup) || null;
}
