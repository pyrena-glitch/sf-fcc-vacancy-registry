import { createClient } from '@supabase/supabase-js';
import { Provider, Vacancy, PublicListing } from '../types/registry';
import { ProviderFormData } from '../components/registry/ProviderOnboarding';
import { VacancyFormData } from '../components/registry/VacancyForm';
import { checkElfaStatus } from './elfa';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Subscribe to auth changes
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

// Provider operations
export async function getProvider(userId: string): Promise<Provider | null> {
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching provider:', error);
    return null;
  }
  return data;
}

export async function createProvider(userId: string, providerData: ProviderFormData): Promise<{ error?: string }> {
  // Check if provider is in ELFA network
  const isElfa = await checkElfaStatus(providerData.license_number);
  console.log(`ELFA check for ${providerData.license_number}: ${isElfa}`);

  const { error } = await supabase
    .from('providers')
    .insert({
      id: userId,
      email: providerData.contact_email,
      license_number: providerData.license_number,
      license_verified: true, // Would verify with CA licensing API
      business_name: providerData.business_name,
      owner_name: providerData.owner_name,
      program_type: providerData.program_type,
      licensed_capacity: providerData.licensed_capacity,
      zip_code: providerData.zip_code,
      neighborhood: providerData.neighborhood || null,
      phone: providerData.phone || null,
      contact_email: providerData.contact_email,
      website: providerData.website || null,
      languages: providerData.languages,
      is_elfa_network: isElfa,
      is_active: true,
      is_approved: true,
    });

  if (error) {
    console.error('Error creating provider:', error);
    return { error: error.message };
  }
  return {};
}

export async function updateProvider(userId: string, updates: Partial<Provider>): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('providers')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('Error updating provider:', error);
    return { error: error.message };
  }
  return {};
}

// Vacancy operations
export async function getVacancy(providerId: string): Promise<Vacancy | null> {
  const { data, error } = await supabase
    .from('vacancies')
    .select('*')
    .eq('provider_id', providerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching vacancy:', error);
  }
  return data || null;
}

export async function upsertVacancy(providerId: string, vacancyData: VacancyFormData): Promise<{ error?: string }> {
  const now = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Expire after 30 days

  const { error } = await supabase
    .from('vacancies')
    .upsert({
      provider_id: providerId,
      infant_spots: vacancyData.infant_spots,
      toddler_spots: vacancyData.toddler_spots,
      preschool_spots: vacancyData.preschool_spots,
      school_age_spots: vacancyData.school_age_spots,
      accepting_infants: vacancyData.accepting_infants,
      accepting_toddlers: vacancyData.accepting_toddlers,
      accepting_preschool: vacancyData.accepting_preschool,
      accepting_school_age: vacancyData.accepting_school_age,
      available_date: vacancyData.available_date,
      full_time_available: vacancyData.full_time_available,
      part_time_available: vacancyData.part_time_available,
      notes: vacancyData.notes || null,
      updated_at: now,
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'provider_id',
    });

  if (error) {
    console.error('Error upserting vacancy:', error);
    return { error: error.message };
  }
  return {};
}

// Public listings
export async function getPublicListings(): Promise<PublicListing[]> {
  const { data, error } = await supabase
    .from('public_listings')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('last_updated', { ascending: false });

  if (error) {
    console.error('Error fetching public listings:', error);
    return [];
  }
  return data || [];
}

// Re-export ELFA check for external use
export { checkElfaStatus } from './elfa';
