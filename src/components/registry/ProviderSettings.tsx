import { useState } from 'react';
import { Provider } from '../../types/registry';
import { LANGUAGES, SF_NEIGHBORHOODS } from '../../types/registry';
import { Save, AlertCircle, CheckCircle, Shield, MapPin, Phone, Globe, FileCheck, User, Key } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { supabase } from '../../lib/supabase';

interface ProviderSettingsProps {
  provider: Provider;
  userEmail: string;
  onSave: (updates: Partial<Provider>) => Promise<{ error?: string }>;
  onReverifyElfa?: () => Promise<void>;
}

export function ProviderSettings({ provider, userEmail, onSave, onReverifyElfa }: ProviderSettingsProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    license_number: provider.license_number,
    business_name: provider.business_name,
    owner_name: provider.owner_name,
    program_type: provider.program_type,
    licensed_capacity: provider.licensed_capacity,
    zip_code: provider.zip_code,
    neighborhood: provider.neighborhood || '',
    phone: provider.phone || '',
    contact_email: provider.contact_email,
    website: provider.website || '',
    languages: provider.languages,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleChangePassword = async () => {
    console.log('handleChangePassword called');

    if (newPassword.length < 6) {
      setPasswordError(t('settings.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordsDoNotMatch'));
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');

    try {
      console.log('Calling supabase.auth.updateUser...');
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      console.log('updateUser response:', { data, error });

      setPasswordLoading(false);

      if (error) {
        console.error('Password update error:', error);
        setPasswordError(error.message);
      } else {
        console.log('Password updated successfully');
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Password update exception:', err);
      setPasswordLoading(false);
      setPasswordError(err instanceof Error ? err.message : 'Unknown error');
    }
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
    setSuccess(false);
    setLoading(true);

    const result = await onSave({
      license_number: formData.license_number,
      business_name: formData.business_name,
      owner_name: formData.owner_name,
      program_type: formData.program_type,
      licensed_capacity: formData.licensed_capacity,
      zip_code: formData.zip_code,
      neighborhood: formData.neighborhood || undefined,
      phone: formData.phone || undefined,
      contact_email: formData.contact_email,
      website: formData.website || undefined,
      languages: formData.languages,
    });

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
        <div className="p-2 bg-gray-100 rounded-lg">
          <Shield size={24} className="text-gray-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t('settings.title')}</h2>
          <p className="text-sm text-gray-500">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Account Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2 mb-3">
          <User size={18} className="text-gray-600" />
          <h3 className="font-medium text-gray-900">{t('settings.account')}</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('settings.loginEmail')}</label>
            <p className="text-sm font-medium text-gray-900">{userEmail}</p>
          </div>

          {!showPasswordChange ? (
            <button
              type="button"
              onClick={() => setShowPasswordChange(true)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <Key size={14} />
              {t('settings.changePassword')}
            </button>
          ) : (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('settings.newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('settings.confirmPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {passwordError && (
                <p className="text-xs text-red-600">{passwordError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {passwordLoading ? t('common.saving') : t('settings.updatePassword')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={14} />
              <span>{t('settings.passwordUpdated')}</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* License Number */}
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileCheck size={16} />
              {t('onboarding.fccLicenseNumber')}
            </label>
            {provider.is_elfa_network && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                {t('settings.elfaMember')}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={formData.license_number}
              onChange={e => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
              placeholder="384001234"
              pattern="\d{9}"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {onReverifyElfa && (
              <button
                type="button"
                onClick={onReverifyElfa}
                className="px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                {t('settings.reverifyElfa')}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('onboarding.licenseNumberHelp')}
          </p>
        </div>

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

        {success && (
          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
            <CheckCircle size={16} />
            <span>{t('settings.savedSuccess')}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
        >
          <Save size={18} />
          {loading ? t('common.saving') : t('settings.saveSettings')}
        </button>
      </form>
    </div>
  );
}
