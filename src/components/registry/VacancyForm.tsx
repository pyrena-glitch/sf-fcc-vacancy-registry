import { useState, useEffect } from 'react';
import { Baby, Clock, Calendar, Save, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { getMaxInfantsAllowed } from '../../utils/compliance';

interface VacancyFormProps {
  initialData?: VacancyFormData;
  onSubmit: (data: VacancyFormData) => Promise<{ error?: string }>;
  programType: 'small_family' | 'large_family';
  currentEnrollment?: {
    total: number;
    infants: number;
  };
}

export interface VacancyFormData {
  infant_spots: number;
  toddler_spots: number;
  preschool_spots: number;
  school_age_spots: number;
  accepting_infants: boolean;
  accepting_toddlers: boolean;
  accepting_preschool: boolean;
  accepting_school_age: boolean;
  available_date: string;
  full_time_available: boolean;
  part_time_available: boolean;
  notes: string;
}

const DEFAULT_DATA: VacancyFormData = {
  infant_spots: 0,
  toddler_spots: 0,
  preschool_spots: 0,
  school_age_spots: 0,
  accepting_infants: false,
  accepting_toddlers: false,
  accepting_preschool: false,
  accepting_school_age: false,
  available_date: new Date().toISOString().split('T')[0],
  full_time_available: true,
  part_time_available: false,
  notes: '',
};

export function VacancyForm({ initialData, onSubmit, programType, currentEnrollment }: VacancyFormProps) {
  const [formData, setFormData] = useState<VacancyFormData>(initialData || DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync form data when initialData changes (e.g., from auto-fill)
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const totalSpots = formData.infant_spots + formData.toddler_spots +
    formData.preschool_spots + formData.school_age_spots;

  const maxCapacity = programType === 'small_family' ? 8 : 14;

  // Compliance check for infant limits
  // Note: vacancy spots are AVAILABLE spots, not additional children
  const complianceWarning = (() => {
    if (!currentEnrollment) return null;

    const availableSpots = maxCapacity - currentEnrollment.total;
    const maxInfantsAllowed = getMaxInfantsAllowed(programType, currentEnrollment.total);
    const infantSpotsAvailable = Math.max(0, maxInfantsAllowed - currentEnrollment.infants);

    // Check if reporting more spots than actually available
    if (totalSpots > availableSpots) {
      return {
        type: 'error' as const,
        message: `You have ${currentEnrollment.total} enrolled with ${maxCapacity} capacity. Only ${availableSpots} spots available, but reporting ${totalSpots}.`,
      };
    }

    // Check if reporting more infant spots than allowed
    if (formData.infant_spots > infantSpotsAvailable) {
      return {
        type: 'warning' as const,
        message: `Infant limit: With ${currentEnrollment.total} children (${currentEnrollment.infants} infants), you can accept ${infantSpotsAvailable} more infants. You're reporting ${formData.infant_spots}.`,
      };
    }

    return null;
  })();

  const handleSpotChange = (field: keyof VacancyFormData, value: number) => {
    const newValue = Math.max(0, value);
    setFormData(prev => ({ ...prev, [field]: newValue }));

    // Auto-enable accepting if spots > 0
    const acceptingField = field.replace('_spots', '');
    if (newValue > 0) {
      setFormData(prev => ({
        ...prev,
        [field]: newValue,
        [`accepting_${acceptingField}s` as keyof VacancyFormData]: true,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (totalSpots === 0 && !formData.accepting_infants && !formData.accepting_toddlers &&
        !formData.accepting_preschool && !formData.accepting_school_age) {
      setError('Please indicate at least one opening or age group you are accepting');
      return;
    }

    setLoading(true);
    const result = await onSubmit(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Baby size={24} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Report Vacancies</h2>
          <p className="text-sm text-gray-500">Update your current openings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Age Group Spots */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Available Spots by Age Group
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Infant */}
            <div className="p-4 border border-pink-200 rounded-lg bg-pink-50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-pink-700">Infant</span>
                <span className="text-xs text-pink-500">Under 2</span>
              </div>
              <input
                type="number"
                min="0"
                max="4"
                value={formData.infant_spots}
                onChange={e => handleSpotChange('infant_spots', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-pink-300 rounded-lg text-center text-lg font-bold"
              />
              <label className="flex items-center gap-2 mt-2 text-xs">
                <input
                  type="checkbox"
                  checked={formData.accepting_infants}
                  onChange={e => setFormData(prev => ({ ...prev, accepting_infants: e.target.checked }))}
                  className="rounded"
                />
                <span>Accepting</span>
              </label>
            </div>

            {/* Toddler */}
            <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-orange-700">Toddler</span>
                <span className="text-xs text-orange-500">2-3 yrs</span>
              </div>
              <input
                type="number"
                min="0"
                max={maxCapacity}
                value={formData.toddler_spots}
                onChange={e => handleSpotChange('toddler_spots', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-orange-300 rounded-lg text-center text-lg font-bold"
              />
              <label className="flex items-center gap-2 mt-2 text-xs">
                <input
                  type="checkbox"
                  checked={formData.accepting_toddlers}
                  onChange={e => setFormData(prev => ({ ...prev, accepting_toddlers: e.target.checked }))}
                  className="rounded"
                />
                <span>Accepting</span>
              </label>
            </div>

            {/* Preschool */}
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-green-700">Preschool</span>
                <span className="text-xs text-green-500">3-5 yrs</span>
              </div>
              <input
                type="number"
                min="0"
                max={maxCapacity}
                value={formData.preschool_spots}
                onChange={e => handleSpotChange('preschool_spots', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-green-300 rounded-lg text-center text-lg font-bold"
              />
              <label className="flex items-center gap-2 mt-2 text-xs">
                <input
                  type="checkbox"
                  checked={formData.accepting_preschool}
                  onChange={e => setFormData(prev => ({ ...prev, accepting_preschool: e.target.checked }))}
                  className="rounded"
                />
                <span>Accepting</span>
              </label>
            </div>

            {/* School Age */}
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-blue-700">School Age</span>
                <span className="text-xs text-blue-500">6+ yrs</span>
              </div>
              <input
                type="number"
                min="0"
                max={maxCapacity}
                value={formData.school_age_spots}
                onChange={e => handleSpotChange('school_age_spots', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-center text-lg font-bold"
              />
              <label className="flex items-center gap-2 mt-2 text-xs">
                <input
                  type="checkbox"
                  checked={formData.accepting_school_age}
                  onChange={e => setFormData(prev => ({ ...prev, accepting_school_age: e.target.checked }))}
                  className="rounded"
                />
                <span>Accepting</span>
              </label>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-2">
            Total spots reported: <strong>{totalSpots}</strong>
          </p>

          {complianceWarning && (
            <div className={`flex items-start gap-2 mt-3 p-3 rounded-lg ${
              complianceWarning.type === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>{complianceWarning.type === 'error' ? 'Violation' : 'Warning'}:</strong>{' '}
                {complianceWarning.message}
              </div>
            </div>
          )}
        </div>

        {/* Availability Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar size={14} className="inline mr-1" />
            When are spots available?
          </label>
          <input
            type="date"
            value={formData.available_date}
            onChange={e => setFormData(prev => ({ ...prev, available_date: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock size={14} className="inline mr-1" />
            Schedule Options
          </label>
          <div className="flex gap-4">
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
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Any special information for families..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
            <CheckCircle size={16} />
            <span>Vacancy information updated successfully!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Update Vacancies'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Your listing will be visible to families searching for childcare.
          <br />
          Please keep this updated to help families find accurate information.
        </p>
      </form>
    </div>
  );
}
