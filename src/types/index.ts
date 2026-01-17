// Per CA Regulation 102416.5: only infant (under 2) has specific limits
export type AgeGroup = 'infant' | 'non_infant';

export interface AgeGroupConfig {
  id: AgeGroup;
  label: string;
  minAgeMonths: number;
  maxAgeMonths: number;
  color: string;
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string
  enrollmentDate: string; // ISO date string
  expectedDepartureDate?: string; // ISO date string (optional - for known departures)
  departureReason?: 'aging_out' | 'kindergarten' | 'moving' | 'other';
  notes?: string;
}

export interface CapacityConfig {
  programType: 'small_family' | 'large_family';
  totalCapacity: number;
  // Note: Infant limits are calculated dynamically per CA Reg 102416.5
  // based on total enrollment, not configured manually
}

export interface ProjectedOpening {
  date: string; // ISO date string
  ageGroup: AgeGroup;
  reason: 'aging_into_next_group' | 'aging_out' | 'kindergarten' | 'scheduled_departure';
  childId: string;
  childName: string;
}

export interface Vacancy {
  ageGroup: AgeGroup;
  currentCount: number;
  capacity: number;
  available: number;
}

export interface Program {
  id: string;
  name: string;
  programType: 'small_family' | 'large_family';
  totalCapacity: number;
  children: Child[];
  createdAt: string; // ISO date string
}
