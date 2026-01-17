import { CapacityConfig } from '../types';
import { Settings } from 'lucide-react';

interface CapacitySettingsProps {
  config: CapacityConfig;
  onChange: (config: CapacityConfig) => void;
}

export function CapacitySettings({ config, onChange }: CapacitySettingsProps) {
  const handleProgramTypeChange = (programType: CapacityConfig['programType']) => {
    // Set default total capacity based on program type
    const totalCapacity = programType === 'small_family' ? 8 : 14;

    onChange({
      programType,
      totalCapacity,
    });
  };

  const maxCapacity = config.programType === 'small_family' ? 8 : 14;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={20} className="text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Capacity Settings</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Program Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="programType"
                value="small_family"
                checked={config.programType === 'small_family'}
                onChange={() => handleProgramTypeChange('small_family')}
                className="mr-2"
              />
              <span className="text-sm">Small Family Child Care</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="programType"
                value="large_family"
                checked={config.programType === 'large_family'}
                onChange={() => handleProgramTypeChange('large_family')}
                className="mr-2"
              />
              <span className="text-sm">Large Family Child Care</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Licensed Capacity
          </label>
          <input
            type="number"
            min="1"
            max={maxCapacity}
            value={config.totalCapacity}
            onChange={e => onChange({ ...config, totalCapacity: parseInt(e.target.value) || 0 })}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum allowed: {maxCapacity}
          </p>
        </div>

        {/* Regulation Reference */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="font-medium text-blue-900 mb-3">CA Regulation 102416.5 - Capacity Rules</h4>

          {config.programType === 'small_family' ? (
            <div className="space-y-3 text-sm">
              <div className="p-2 bg-white rounded border-l-4 border-blue-400">
                <p className="font-medium text-gray-800">1-4 total children</p>
                <p className="text-gray-600">All can be infants (max 4 infants)</p>
              </div>
              <div className="p-2 bg-white rounded border-l-4 border-blue-400">
                <p className="font-medium text-gray-800">5-6 total children</p>
                <p className="text-gray-600">Max 3 infants allowed</p>
              </div>
              <div className="p-2 bg-white rounded border-l-4 border-amber-400">
                <p className="font-medium text-gray-800">7-8 total children</p>
                <p className="text-gray-600">Max 2 infants allowed</p>
                <p className="text-xs text-amber-700 mt-1">
                  Requires: 1 child in K-12 school + 1 child at least 6 years old
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="p-2 bg-white rounded border-l-4 border-blue-400">
                <p className="font-medium text-gray-800">1-12 total children</p>
                <p className="text-gray-600">Max 4 infants allowed</p>
              </div>
              <div className="p-2 bg-white rounded border-l-4 border-amber-400">
                <p className="font-medium text-gray-800">13-14 total children</p>
                <p className="text-gray-600">Max 3 infants allowed</p>
                <p className="text-xs text-amber-700 mt-1">
                  Requires: 1 child in K-12 school + 1 child at least 6 years old
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Infant:</strong> Child under 2 years old
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Infant limits are calculated automatically based on your current enrollment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
