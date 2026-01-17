import { useState } from 'react';
import { LANGUAGES, SF_NEIGHBORHOODS } from '../../types/registry';
import { FileCheck, Building2, MapPin, Phone, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ProviderOnboardingProps {
  onComplete: (data: ProviderFormData) => Promise<{ error?: string }>;
  onSkip?: () => void;
}

export interface ProviderFormData {
  license_number: string;
  business_name: string;
  owner_name: string;
  program_type: 'small_family' | 'large_family';
  licensed_capacity: number;
  zip_code: string;
  neighborhood?: string;
  phone?: string;
  contact_email: string;
  website?: string;
  languages: string[];
}

export function ProviderOnboarding({ onComplete }: ProviderOnboardingProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending');

  const [formData, setFormData] = useState<ProviderFormData>({
    license_number: '',
    business_name: '',
    owner_name: '',
    program_type: 'small_family',
    licensed_capacity: 8,
    zip_code: '',
    neighborhood: '',
    phone: '',
    contact_email: '',
    website: '',
    languages: ['English'],
  });

  const handleVerifyLicense = () => {
    const licenseNumber = formData.license_number.trim();

    if (!licenseNumber) {
      setError(t('onboarding.enterLicenseNumber'));
      return;
    }

    // Basic format check - 9 digits
    const licensePattern = /^\d{9}$/;
    if (!licensePattern.test(licenseNumber)) {
      setError(t('onboarding.licenseVerificationFailed'));
      return;
    }

    // Format is valid - proceed to next step
    // Actual license verification will be done manually in batch
    setVerificationStatus('verified');
    setError('');
    setStep(2);
  };

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

    const result = await onComplete(formData);

    if (result.error) {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">{t('onboarding.verifyLicense')}</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-200" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">{t('onboarding.programInfo')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileCheck size={32} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('onboarding.verifyYourLicense')}</h2>
                <p className="text-gray-600 mt-1">
                  {t('onboarding.enterLicensePrompt')}
                </p>
              </div>

              <div className="max-w-sm mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('onboarding.fccLicenseNumber')}
                </label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={e => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                  placeholder="e.g., 384001234"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-wider"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {t('onboarding.licenseNumberHelp')}
                </p>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg mt-4">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {verificationStatus === 'verified' && (
                  <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg mt-4">
                    <CheckCircle size={16} />
                    <span>{t('onboarding.licenseVerified')}</span>
                  </div>
                )}

                <button
                  onClick={handleVerifyLicense}
                  disabled={loading}
                  className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {loading ? t('onboarding.verifying') : t('onboarding.verifyLicense')}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('onboarding.programInfo')}</h2>
                <p className="text-gray-600 mt-1">
                  {t('onboarding.subtitle')}
                </p>
              </div>

              <div className="space-y-6">
                {/* Business Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('onboarding.businessName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.business_name}
                      onChange={e => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                      placeholder="Sunshine Family Care"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('onboarding.ownerName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.owner_name}
                      onChange={e => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                      placeholder="Maria Garcia"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Program Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('onboarding.programType')} *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, program_type: 'small_family', licensed_capacity: 8 }))}
                      className={`p-3 border-2 rounded-lg text-left transition-colors ${
                        formData.program_type === 'small_family'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium">{t('onboarding.smallFamilyShort')}</p>
                      <p className="text-xs text-gray-500">{t('onboarding.upTo8')}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, program_type: 'large_family', licensed_capacity: 14 }))}
                      className={`p-3 border-2 rounded-lg text-left transition-colors ${
                        formData.program_type === 'large_family'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium">{t('onboarding.largeFamilyShort')}</p>
                      <p className="text-xs text-gray-500">{t('onboarding.upTo14')}</p>
                    </button>
                  </div>
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin size={14} className="inline mr-1" />
                      {t('onboarding.zipCode')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.zip_code}
                      onChange={e => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                      placeholder="94110"
                      pattern="[0-9]{5}"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('onboarding.neighborhood')}
                    </label>
                    <select
                      value={formData.neighborhood}
                      onChange={e => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('onboarding.selectNeighborhood')}</option>
                      {SF_NEIGHBORHOODS.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone size={14} className="inline mr-1" />
                      {t('onboarding.phone')}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(415) 555-1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('onboarding.contactEmail')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.contact_email}
                      onChange={e => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="contact@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe size={14} className="inline mr-1" />
                    {t('onboarding.website')}
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('onboarding.languages')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleToggleLanguage(lang)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                          formData.languages.includes(lang)
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    {t('common.back')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? t('onboarding.settingUp') : t('onboarding.completeSetup')}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
