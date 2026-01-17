import { CapacityConfig, Child } from '../types';
import { getAgeGroup } from './ageGroups';

/**
 * CA Regulation 102416.5 - Capacity Rules
 *
 * Small Family Child Care Home:
 * - (1) Four infants; or
 * - (2) Six children, no more than three of whom may be infants; or
 * - (3) 7-8 children (with school-age criteria), no more than two infants
 *
 * Large Family Child Care Home:
 * - (1) Twelve children, no more than four of whom may be infants; or
 * - (2) 13-14 children (with school-age criteria), no more than three infants
 */

export interface ComplianceStatus {
  isCompliant: boolean;
  totalChildren: number;
  infantCount: number;
  nonInfantCount: number;
  maxInfantsAllowed: number;
  maxTotalAllowed: number;
  infantSpotsAvailable: number;
  totalSpotsAvailable: number;
  warnings: string[];
  errors: string[];
}

/**
 * Calculate the maximum number of infants allowed based on program type and total enrollment
 */
export function getMaxInfantsAllowed(
  programType: 'small_family' | 'large_family',
  totalChildren: number
): number {
  if (programType === 'small_family') {
    // Small Family rules per 102416.5(b)
    if (totalChildren <= 4) {
      return 4; // Can be all infants up to 4
    } else if (totalChildren <= 6) {
      return 3; // Max 3 infants for 5-6 children
    } else {
      return 2; // Max 2 infants for 7-8 children
    }
  } else {
    // Large Family rules per 102416.5(d)
    if (totalChildren <= 12) {
      return 4; // Max 4 infants for up to 12 children
    } else {
      return 3; // Max 3 infants for 13-14 children
    }
  }
}

/**
 * Calculate how many more infants could be added given current enrollment
 */
export function getAvailableInfantSpots(
  programType: 'small_family' | 'large_family',
  totalCapacity: number,
  currentInfants: number,
  currentNonInfants: number
): number {
  const totalChildren = currentInfants + currentNonInfants;
  const totalSpotsLeft = totalCapacity - totalChildren;

  if (totalSpotsLeft <= 0) return 0;

  // Check each scenario: adding 1, 2, 3... infants
  // For each, calculate if it would be compliant
  let maxNewInfants = 0;

  for (let newInfants = 1; newInfants <= totalSpotsLeft; newInfants++) {
    const newTotal = totalChildren + newInfants;
    const newInfantCount = currentInfants + newInfants;
    const maxAllowed = getMaxInfantsAllowed(programType, newTotal);

    if (newInfantCount <= maxAllowed) {
      maxNewInfants = newInfants;
    } else {
      break;
    }
  }

  return maxNewInfants;
}

/**
 * Calculate comprehensive compliance status
 */
export function calculateComplianceStatus(
  children: Child[],
  capacityConfig: CapacityConfig
): ComplianceStatus {
  const today = new Date();
  let infantCount = 0;
  let nonInfantCount = 0;

  for (const child of children) {
    const ageGroup = getAgeGroup(child.dateOfBirth, today);
    if (ageGroup === 'infant') {
      infantCount++;
    } else if (ageGroup === 'non_infant') {
      nonInfantCount++;
    }
    // Children who aged out (null) are not counted
  }

  const totalChildren = infantCount + nonInfantCount;
  const maxInfantsAllowed = getMaxInfantsAllowed(capacityConfig.programType, totalChildren);
  const maxTotalAllowed = capacityConfig.totalCapacity;

  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for violations
  if (totalChildren > maxTotalAllowed) {
    errors.push(`Over capacity: ${totalChildren} children exceeds licensed capacity of ${maxTotalAllowed}`);
  }

  if (infantCount > maxInfantsAllowed) {
    errors.push(`Infant ratio violation: ${infantCount} infants exceeds maximum of ${maxInfantsAllowed} allowed for ${totalChildren} total children`);
  }

  // Warnings for approaching limits
  if (totalChildren === maxTotalAllowed) {
    warnings.push('At full capacity');
  } else if (totalChildren >= maxTotalAllowed - 1) {
    warnings.push('Near full capacity');
  }

  if (infantCount === maxInfantsAllowed && infantCount > 0) {
    warnings.push('At maximum infant capacity');
  }

  // Special warnings for school-age requirements
  if (capacityConfig.programType === 'small_family' && totalChildren > 6) {
    warnings.push('7-8 children requires: 1 child in K-12 + 1 child age 6+');
  }
  if (capacityConfig.programType === 'large_family' && totalChildren > 12) {
    warnings.push('13-14 children requires: 1 child in K-12 + 1 child age 6+');
  }

  const infantSpotsAvailable = getAvailableInfantSpots(
    capacityConfig.programType,
    maxTotalAllowed,
    infantCount,
    nonInfantCount
  );

  const totalSpotsAvailable = Math.max(0, maxTotalAllowed - totalChildren);

  return {
    isCompliant: errors.length === 0,
    totalChildren,
    infantCount,
    nonInfantCount,
    maxInfantsAllowed,
    maxTotalAllowed,
    infantSpotsAvailable,
    totalSpotsAvailable,
    warnings,
    errors,
  };
}

/**
 * Get a human-readable explanation of current capacity rules
 */
export function getCapacityRuleDescription(
  programType: 'small_family' | 'large_family',
  totalChildren: number
): string {
  if (programType === 'small_family') {
    if (totalChildren <= 4) {
      return 'With 1-4 children, all can be infants (max 4 infants)';
    } else if (totalChildren <= 6) {
      return 'With 5-6 children, max 3 can be infants';
    } else {
      return 'With 7-8 children, max 2 can be infants (requires school-age criteria)';
    }
  } else {
    if (totalChildren <= 12) {
      return 'With 1-12 children, max 4 can be infants';
    } else {
      return 'With 13-14 children, max 3 can be infants (requires school-age criteria)';
    }
  }
}
