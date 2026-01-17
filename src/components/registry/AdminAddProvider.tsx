import { useState } from 'react';
import { LANGUAGES, SF_NEIGHBORHOODS } from '../../types/registry';
import { Building2, MapPin, Phone, Globe, CheckCircle, AlertCircle, Shield, Baby } from 'lucide-react';
import { supabase, checkElfaStatus } from '../../lib/supabase';

interface AdminAddProviderProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function AdminAddProvider({ onComplete, onCancel }: AdminAddProviderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    license_number: '',
    business_name: '',
    owner_name: '',
    program_type: 'small_family' as 'small_family' | 'large_family',
    licensed_capacity: 8,
    zip_code: '',
    neighborhood: '',
    phone: '',
    contact_email: '',
    website: '',
    languages: ['English'] as string[],
    // Vacancy info
    infant_spots: 0,
    toddler_spots: 0,
    preschool_spots: 0,
    school_age_spots: 0,
    full_time_available: true,
    part_time_available: false,
    waitlist_available: false,
    notes: '',
  });

  const handleToggleLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Generate a random UUID for admin-created provider
      const providerId = crypto.randomUUID();

      // Check ELFA network status
      const isElfa = await checkElfaStatus(formData.license_number);
      console.log('ELFA check result:', isElfa);

      // Insert provider
      const { error: providerError } = await supabase
        .from('providers')
        .insert({
          id: providerId,
          email: formData.contact_email,
          license_number: formData.license_number,
          license_verified: true,
          business_name: formData.business_name,
          owner_name: formData.owner_name,
          program_type: formData.program_type,
          licensed_capacity: formData.licensed_capacity,
          zip_code: formData.zip_code,
          neighborhood: formData.neighborhood || null,
          phone: formData.phone || null,
          contact_email: formData.contact_email,
          website: formData.website || null,
          languages: formData.languages,
          is_elfa_network: isElfa,
          is_active: true,
          is_approved: true,
        });

      if (providerError) {
        throw providerError;
      }

      // Insert vacancy
      const now = new Date().toISOString();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: vacancyError } = await supabase
        .from('vacancies')
        .insert({
          provider_id: providerId,
          infant_spots: formData.infant_spots,
          toddler_spots: formData.toddler_spots,
          preschool_spots: formData.preschool_spots,
          school_age_spots: formData.school_age_spots,
          accepting_infants: formData.infant_spots > 0,
          accepting_toddlers: formData.toddler_spots > 0,
          accepting_preschool: formData.preschool_spots > 0,
          accepting_school_age: formData.school_age_spots > 0,
          available_date: now.split('T')[0],
          full_time_available: formData.full_time_available,
          part_time_available: formData.part_time_available,
          waitlist_available: formData.waitlist_available,
          notes: formData.notes || null,
          updated_at: now,
          expires_at: expiresAt.toISOString(),
        });

      if (vacancyError) {
        throw vacancyError;
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err) {
      console.error('Admin add provider error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add provider');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Provider Added!</h2>
            <p className="text-gray-600">
              {formData.business_name} has been added to the registry.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield size={24} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Admin: Add Provider</h2>
              <p className="text-sm text-gray-500">Manually add a provider listing</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* License & Business Info */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Building2 size={18} />
                Provider Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.license_number}
                    onChange={e => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                    placeholder="384001234"
                    pattern="\d{9}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.business_name}
                    onChange={e => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                    placeholder="Sunshine Family Care"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.owner_name}
                    onChange={e => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                    placeholder="Maria Garcia"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Program Type *
                  </label>
                  <select
                    value={formData.program_type}
                    onChange={e => {
                      const type = e.target.value as 'small_family' | 'large_family';
                      setFormData(prev => ({
                        ...prev,
                        program_type: type,
                        licensed_capacity: type === 'small_family' ? 8 : 14
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="small_family">Small Family (up to 8)</option>
                    <option value="large_family">Large Family (up to 14)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <MapPin size={18} />
                Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.zip_code}
                    onChange={e => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="94110"
                    pattern="[0-9]{5}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Neighborhood
                  </label>
                  <select
                    value={formData.neighborhood}
                    onChange={e => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select...</option>
                    {SF_NEIGHBORHOODS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Phone size={18} />
                Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(415) 555-1234"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contact_email}
                    onChange={e => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="contact@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe size={14} className="inline mr-1" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages Spoken
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleToggleLanguage(lang)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      formData.languages.includes(lang)
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Vacancy Info */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Baby size={18} />
                Current Vacancies
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Infant (0-2)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.infant_spots}
                    onChange={e => setFormData(prev => ({ ...prev, infant_spots: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Toddler (2-3)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.toddler_spots}
                    onChange={e => setFormData(prev => ({ ...prev, toddler_spots: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Preschool (3-5)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.preschool_spots}
                    onChange={e => setFormData(prev => ({ ...prev, preschool_spots: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    School Age (6+)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.school_age_spots}
                    onChange={e => setFormData(prev => ({ ...prev, school_age_spots: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.full_time_available}
                    onChange={e => setFormData(prev => ({ ...prev, full_time_available: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Full-time</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.part_time_available}
                    onChange={e => setFormData(prev => ({ ...prev, part_time_available: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Part-time</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.waitlist_available}
                    onChange={e => setFormData(prev => ({ ...prev, waitlist_available: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Waitlist available</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (visible to families)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special information..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'Adding Provider...' : 'Add Provider to Registry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
