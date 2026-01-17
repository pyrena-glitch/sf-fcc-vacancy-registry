// SF FCC Vacancy Registry Types

export interface Provider {
  id: string;

  // Auth
  email: string;
  created_at: string;
  last_login?: string;

  // License Info
  license_number: string;
  license_verified: boolean;
  license_verified_at?: string;

  // Program Info
  business_name: string;
  owner_name: string;
  program_type: 'small_family' | 'large_family';
  licensed_capacity: number;

  // Location
  address?: string;
  neighborhood?: string;
  zip_code: string;

  // Contact
  phone?: string;
  contact_email: string;
  website?: string;

  // ELFA Status
  is_elfa_network: boolean;
  elfa_verified_at?: string;

  // Languages
  languages: string[];

  // Status
  is_active: boolean;
  is_approved: boolean;
}

export interface Vacancy {
  id: string;
  provider_id: string;

  // Vacancy Info
  infant_spots: number;      // Under 2
  toddler_spots: number;     // 2-3 years (for display, though not regulated separately)
  preschool_spots: number;   // 3-5 years
  school_age_spots: number;  // 6+ (before/after school)

  // Availability
  available_date: string;    // When spots open (could be now or future)
  accepting_infants: boolean;
  accepting_toddlers: boolean;
  accepting_preschool: boolean;
  accepting_school_age: boolean;

  // Schedule
  full_time_available: boolean;
  part_time_available: boolean;

  // Waitlist
  waitlist_available: boolean;

  // Additional Info
  notes?: string;

  // Timestamps
  reported_at: string;
  updated_at: string;
  expires_at: string;        // Auto-expire stale listings (e.g., 30 days)
}

export interface PublicListing {
  // Provider Info (public-safe)
  provider_id: string;
  business_name: string;
  license_number: string;
  neighborhood?: string;
  zip_code: string;

  // Contact
  phone?: string;
  contact_email: string;
  website?: string;

  // Program Info
  program_type: 'small_family' | 'large_family';
  is_elfa_network: boolean;
  languages: string[];

  // Vacancy Info
  total_spots_available: number;
  infant_spots: number;
  toddler_spots: number;
  preschool_spots: number;
  school_age_spots: number;

  accepting_infants: boolean;
  accepting_toddlers: boolean;
  accepting_preschool: boolean;
  accepting_school_age: boolean;

  full_time_available: boolean;
  part_time_available: boolean;
  waitlist_available: boolean;
  notes?: string;

  available_date: string;
  last_updated: string;
}

// Search/Filter options
export interface SearchFilters {
  zip_code?: string;
  neighborhood?: string;
  age_group?: 'infant' | 'toddler' | 'preschool' | 'school_age';
  elfa_only?: boolean;
  language?: string;
  schedule?: 'full_time' | 'part_time';
}

// SF Neighborhoods for filtering
export const SF_NEIGHBORHOODS = [
  'Bayview',
  'Bernal Heights',
  'Castro',
  'Chinatown',
  'Excelsior',
  'Financial District',
  'Haight-Ashbury',
  'Inner Richmond',
  'Inner Sunset',
  'Marina',
  'Mission',
  'Nob Hill',
  'Noe Valley',
  'North Beach',
  'Outer Richmond',
  'Outer Sunset',
  'Pacific Heights',
  'Portola',
  'Potrero Hill',
  'Russian Hill',
  'SoMa',
  'Tenderloin',
  'Visitacion Valley',
  'Western Addition',
] as const;

// Common languages in SF childcare
export const LANGUAGES = [
  'English',
  'Spanish',
  'Cantonese',
  'Mandarin',
  'Tagalog',
  'Vietnamese',
  'Russian',
  'Arabic',
  'Korean',
  'Japanese',
  'French',
  'Other',
] as const;
