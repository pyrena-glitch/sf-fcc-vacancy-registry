import { useState, useEffect } from 'react';
import { Provider, Vacancy } from '../../types/registry';
import { Organization, getVacanciesByProviderIds, updateProviderVacancy } from '../../lib/supabase';
import { VacancyFormData } from './VacancyForm';
import { ChevronRight, X, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface OrganizationDashboardProps {
  organization: Organization;
  providers: Provider[];
  onRefresh: () => void;
}

type VacancyStatus = 'open' | 'upcoming' | 'waitlist' | 'full';

interface ProviderWithVacancy {
  provider: Provider;
  vacancy: Vacancy | null;
  status: VacancyStatus;
  statusText: string;
  statusDetail: string;
  sortOrder: number;
}

function getVacancyStatus(vacancy: Vacancy | null): { status: VacancyStatus; text: string; detail: string; sortOrder: number } {
  if (!vacancy) {
    return { status: 'full', text: 'No data', detail: 'Update vacancy info', sortOrder: 4 };
  }

  const totalSpots = vacancy.infant_spots + vacancy.toddler_spots + vacancy.preschool_spots + vacancy.school_age_spots;

  if (totalSpots > 0) {
    const parts: string[] = [];
    if (vacancy.infant_spots > 0) parts.push(`Infant: ${vacancy.infant_spots}`);
    if (vacancy.toddler_spots > 0) parts.push(`Toddler: ${vacancy.toddler_spots}`);
    if (vacancy.preschool_spots > 0) parts.push(`Preschool: ${vacancy.preschool_spots}`);
    if (vacancy.school_age_spots > 0) parts.push(`School Age: ${vacancy.school_age_spots}`);

    return {
      status: 'open',
      text: `${totalSpots} spot${totalSpots > 1 ? 's' : ''} open`,
      detail: parts.join(', '),
      sortOrder: 1,
    };
  }

  // Check for upcoming based on available_date
  if (vacancy.available_date) {
    const availDate = new Date(vacancy.available_date);
    const now = new Date();
    const monthsDiff = (availDate.getFullYear() - now.getFullYear()) * 12 + (availDate.getMonth() - now.getMonth());

    if (monthsDiff > 0 && monthsDiff <= 6) {
      const monthName = availDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return {
        status: 'upcoming',
        text: `Opening ${monthName}`,
        detail: 'Future availability',
        sortOrder: 2,
      };
    }
  }

  if (vacancy.waitlist_available) {
    return { status: 'waitlist', text: 'Waitlist', detail: 'Accepting waitlist', sortOrder: 3 };
  }

  return { status: 'full', text: 'Full', detail: 'No current openings', sortOrder: 4 };
}

export function OrganizationDashboard({ organization, providers, onRefresh }: OrganizationDashboardProps) {
  const [vacancies, setVacancies] = useState<Record<string, Vacancy>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [editingVacancy, setEditingVacancy] = useState<VacancyFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadVacancies();
  }, [providers]);

  const loadVacancies = async () => {
    if (providers.length === 0) {
      setLoading(false);
      return;
    }

    const providerIds = providers.map(p => p.id);
    const vacancyMap = await getVacanciesByProviderIds(providerIds);
    setVacancies(vacancyMap);
    setLoading(false);
  };

  // Build sorted list
  const providersWithStatus: ProviderWithVacancy[] = providers.map(provider => {
    const vacancy = vacancies[provider.id] || null;
    const { status, text, detail, sortOrder } = getVacancyStatus(vacancy);
    return {
      provider,
      vacancy,
      status,
      statusText: text,
      statusDetail: detail,
      sortOrder,
    };
  }).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.provider.business_name.localeCompare(b.provider.business_name);
  });

  const handleSelectProvider = (provider: Provider) => {
    const vacancy = vacancies[provider.id];
    setSelectedProvider(provider);
    setEditingVacancy({
      infant_spots: vacancy?.infant_spots || 0,
      toddler_spots: vacancy?.toddler_spots || 0,
      preschool_spots: vacancy?.preschool_spots || 0,
      school_age_spots: vacancy?.school_age_spots || 0,
      accepting_infants: vacancy?.accepting_infants || false,
      accepting_toddlers: vacancy?.accepting_toddlers || false,
      accepting_preschool: vacancy?.accepting_preschool || false,
      accepting_school_age: vacancy?.accepting_school_age || false,
      available_date: vacancy?.available_date || new Date().toISOString().split('T')[0],
      full_time_available: vacancy?.full_time_available ?? true,
      part_time_available: vacancy?.part_time_available ?? false,
      waitlist_available: vacancy?.waitlist_available ?? false,
      notes: vacancy?.notes || '',
    });
    setSaveError('');
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedProvider || !editingVacancy) return;

    setSaving(true);
    setSaveError('');

    const result = await updateProviderVacancy(selectedProvider.id, editingVacancy);

    setSaving(false);

    if (result.error) {
      setSaveError(result.error);
    } else {
      setSaveSuccess(true);
      await loadVacancies();
      setTimeout(() => {
        setSelectedProvider(null);
        setEditingVacancy(null);
        setSaveSuccess(false);
        onRefresh();
      }, 1000);
    }
  };

  const handleSpotChange = (field: keyof VacancyFormData, value: number) => {
    if (!editingVacancy) return;
    setEditingVacancy({
      ...editingVacancy,
      [field]: Math.max(0, value),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{organization.name}</h1>
        <p className="text-sm text-gray-500">{providers.length} locations</p>
      </div>

      {/* Overview Card */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="font-medium text-gray-900">Program Availability</h2>
        </div>

        <div className="divide-y">
          {providersWithStatus.map(({ provider, status, statusText, statusDetail }) => (
            <button
              key={provider.id}
              onClick={() => handleSelectProvider(provider)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div>
                <div className="font-medium text-gray-900">{provider.business_name}</div>
                <div className="text-sm text-gray-500">{provider.neighborhood || provider.zip_code}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className={`font-medium text-sm ${
                    status === 'open' ? 'text-green-600' :
                    status === 'upcoming' ? 'text-amber-600' :
                    status === 'waitlist' ? 'text-blue-600' :
                    'text-gray-400'
                  }`}>
                    {statusText}
                  </div>
                  <div className="text-xs text-gray-400">{statusDetail}</div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 bg-gray-50 border-t">
          <p className="text-xs text-gray-400">
            Updated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      {selectedProvider && editingVacancy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedProvider.business_name}</h3>
                <p className="text-sm text-gray-500">{selectedProvider.neighborhood || selectedProvider.zip_code}</p>
              </div>
              <button
                onClick={() => { setSelectedProvider(null); setEditingVacancy(null); }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Spots</label>
                <div className="space-y-3">
                  {[
                    { key: 'infant_spots', label: 'Infant', sublabel: '0-24 months' },
                    { key: 'toddler_spots', label: 'Toddler', sublabel: '2-3 years' },
                    { key: 'preschool_spots', label: 'Preschool', sublabel: '3-5 years' },
                    { key: 'school_age_spots', label: 'School Age', sublabel: '5+ years' },
                  ].map(({ key, label, sublabel }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-900">{label}</span>
                        <span className="text-xs text-gray-400 ml-2">{sublabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSpotChange(key as keyof VacancyFormData, (editingVacancy[key as keyof VacancyFormData] as number) - 1)}
                          className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-50"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">
                          {editingVacancy[key as keyof VacancyFormData]}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSpotChange(key as keyof VacancyFormData, (editingVacancy[key as keyof VacancyFormData] as number) + 1)}
                          className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">If full, when available?</label>
                <input
                  type="date"
                  value={editingVacancy.available_date}
                  onChange={(e) => setEditingVacancy({ ...editingVacancy, available_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingVacancy.waitlist_available}
                    onChange={(e) => setEditingVacancy({ ...editingVacancy, waitlist_available: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Waitlist available</span>
                </label>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={16} />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                  <CheckCircle size={16} />
                  <span>Saved!</span>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t bg-gray-50">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
