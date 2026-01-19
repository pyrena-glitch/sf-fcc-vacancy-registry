import { useState, useEffect, useRef } from 'react';
import { Provider, Vacancy } from '../../types/registry';
import { Organization, getVacanciesByProviderIds, updateProviderVacancy } from '../../lib/supabase';
import { VacancyFormData } from './VacancyForm';
import { ChevronRight, X, Save, AlertCircle, CheckCircle, Upload, Download } from 'lucide-react';

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

  // CSV Import state
  const [showImport, setShowImport] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Download CSV template with current data
  const handleDownloadTemplate = () => {
    const headers = ['license_number', 'business_name', 'infant_spots', 'toddler_spots', 'preschool_spots', 'school_age_spots', 'available_date', 'waitlist'];
    const rows = providers.map(p => {
      const v = vacancies[p.id];
      return [
        p.license_number,
        `"${p.business_name}"`,
        v?.infant_spots || 0,
        v?.toddler_spots || 0,
        v?.preschool_spots || 0,
        v?.school_age_spots || 0,
        v?.available_date || '',
        v?.waitlist_available ? 'yes' : 'no',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vacancy-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle CSV file import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportSuccess('');
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV must have a header row and at least one data row');
      }

      // Parse header to find column indices
      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      const licenseIdx = header.findIndex(h => h.includes('license'));
      const infantIdx = header.findIndex(h => h.includes('infant'));
      const toddlerIdx = header.findIndex(h => h.includes('toddler'));
      const preschoolIdx = header.findIndex(h => h.includes('preschool'));
      const schoolAgeIdx = header.findIndex(h => h.includes('school'));
      const dateIdx = header.findIndex(h => h.includes('date') || h.includes('available'));
      const waitlistIdx = header.findIndex(h => h.includes('waitlist'));

      if (licenseIdx === -1) {
        throw new Error('CSV must have a license_number column');
      }

      // Build license -> provider map
      const licenseToProvider = new Map<string, Provider>();
      for (const p of providers) {
        licenseToProvider.set(p.license_number, p);
      }

      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Handle quoted fields
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const license = values[licenseIdx]?.trim();
        if (!license) continue;

        const provider = licenseToProvider.get(license);
        if (!provider) {
          errors.push(`Row ${i + 1}: License ${license} not found`);
          skipped++;
          continue;
        }

        const vacancyData: VacancyFormData = {
          infant_spots: infantIdx >= 0 ? parseInt(values[infantIdx]) || 0 : 0,
          toddler_spots: toddlerIdx >= 0 ? parseInt(values[toddlerIdx]) || 0 : 0,
          preschool_spots: preschoolIdx >= 0 ? parseInt(values[preschoolIdx]) || 0 : 0,
          school_age_spots: schoolAgeIdx >= 0 ? parseInt(values[schoolAgeIdx]) || 0 : 0,
          accepting_infants: infantIdx >= 0 ? (parseInt(values[infantIdx]) || 0) > 0 : false,
          accepting_toddlers: toddlerIdx >= 0 ? (parseInt(values[toddlerIdx]) || 0) > 0 : false,
          accepting_preschool: preschoolIdx >= 0 ? (parseInt(values[preschoolIdx]) || 0) > 0 : false,
          accepting_school_age: schoolAgeIdx >= 0 ? (parseInt(values[schoolAgeIdx]) || 0) > 0 : false,
          available_date: dateIdx >= 0 && values[dateIdx] ? values[dateIdx] : new Date().toISOString().split('T')[0],
          full_time_available: true,
          part_time_available: false,
          waitlist_available: waitlistIdx >= 0 ? ['yes', 'true', '1'].includes(values[waitlistIdx]?.toLowerCase()) : false,
          notes: '',
        };

        const result = await updateProviderVacancy(provider.id, vacancyData);
        if (result.error) {
          errors.push(`Row ${i + 1}: ${result.error}`);
          skipped++;
        } else {
          updated++;
        }
      }

      await loadVacancies();
      onRefresh();

      if (errors.length > 0) {
        setImportError(`Updated ${updated}, skipped ${skipped}. Errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`);
      } else {
        setImportSuccess(`Successfully updated ${updated} location${updated !== 1 ? 's' : ''}`);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{organization.name}</h1>
          <p className="text-sm text-gray-500">{providers.length} locations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
        </div>
      </div>

      {/* Import success/error messages */}
      {importSuccess && (
        <div className="mb-4 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
          <CheckCircle size={18} />
          <span className="text-sm">{importSuccess}</span>
          <button onClick={() => setImportSuccess('')} className="ml-auto text-green-600 hover:text-green-800">
            <X size={16} />
          </button>
        </div>
      )}
      {importError && (
        <div className="mb-4 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
          <AlertCircle size={18} />
          <span className="text-sm">{importError}</span>
          <button onClick={() => setImportError('')} className="ml-auto text-red-600 hover:text-red-800">
            <X size={16} />
          </button>
        </div>
      )}

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

      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Import Vacancy Data</h3>
              <button
                onClick={() => { setShowImport(false); setImportError(''); }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-3">Upload a CSV file to update vacancy data for all locations at once.</p>
                <p className="font-medium text-gray-900 mb-2">Required columns:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li><code className="bg-gray-100 px-1 rounded">license_number</code> - to identify location</li>
                  <li><code className="bg-gray-100 px-1 rounded">infant_spots</code>, <code className="bg-gray-100 px-1 rounded">toddler_spots</code>, etc.</li>
                  <li><code className="bg-gray-100 px-1 rounded">available_date</code> - YYYY-MM-DD format</li>
                  <li><code className="bg-gray-100 px-1 rounded">waitlist</code> - yes/no</li>
                </ul>
              </div>

              <button
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <Download size={16} />
                Download template with current data
              </button>

              <div className="border-t pt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    importing ? 'bg-gray-50 border-gray-300' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {importing ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                      <span className="text-gray-600">Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="text-gray-400" />
                      <span className="text-gray-600">Click to select CSV file</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

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
