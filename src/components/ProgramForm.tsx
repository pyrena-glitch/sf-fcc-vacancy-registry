import { useState } from 'react';
import { Program } from '../types';
import { X } from 'lucide-react';

interface ProgramFormProps {
  onSubmit: (data: { name: string; programType: 'small_family' | 'large_family'; totalCapacity: number }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  initialData?: Program;
}

export function ProgramForm({ onSubmit, onCancel, onDelete, initialData }: ProgramFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    programType: initialData?.programType || 'small_family' as 'small_family' | 'large_family',
    totalCapacity: initialData?.totalCapacity || 8,
  });

  const handleProgramTypeChange = (programType: 'small_family' | 'large_family') => {
    const defaultCapacity = programType === 'small_family' ? 8 : 14;
    setFormData(prev => ({
      ...prev,
      programType,
      totalCapacity: defaultCapacity,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  const maxCapacity = formData.programType === 'small_family' ? 8 : 14;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Program' : 'Create New Program'}
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Sunshine Family Care, Main Street Location"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleProgramTypeChange('small_family')}
                className={`p-3 border-2 rounded-lg text-left transition-colors ${
                  formData.programType === 'small_family'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">Small Family</p>
                <p className="text-xs text-gray-500">Up to 8 children</p>
              </button>
              <button
                type="button"
                onClick={() => handleProgramTypeChange('large_family')}
                className={`p-3 border-2 rounded-lg text-left transition-colors ${
                  formData.programType === 'large_family'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">Large Family</p>
                <p className="text-xs text-gray-500">Up to 14 children</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Licensed Capacity
            </label>
            <input
              type="number"
              min="1"
              max={maxCapacity}
              value={formData.totalCapacity}
              onChange={e => setFormData(prev => ({ ...prev, totalCapacity: parseInt(e.target.value) || 1 }))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum: {maxCapacity}</p>
          </div>

          <div className="flex justify-between items-center pt-4">
            {initialData && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete "${initialData.name}"? This will remove all enrolled children data.`)) {
                    onDelete();
                  }
                }}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
              >
                Delete Program
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {initialData ? 'Save Changes' : 'Create Program'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
