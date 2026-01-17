import { Program } from '../types';
import { ChevronDown, Plus, Building2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { calculateComplianceStatus } from '../utils/compliance';

interface ProgramSelectorProps {
  programs: Program[];
  activeProgram: Program | null;
  onSelect: (programId: string) => void;
  onCreateNew: () => void;
}

export function ProgramSelector({
  programs,
  activeProgram,
  onSelect,
  onCreateNew,
}: ProgramSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (programs.length === 0) {
    return (
      <button
        onClick={onCreateNew}
        className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        <Plus size={16} />
        Create First Program
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 min-w-[200px]"
      >
        <Building2 size={18} className="text-gray-500" />
        <span className="flex-1 text-left font-medium text-gray-900 truncate">
          {activeProgram?.name || 'Select Program'}
        </span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase px-2">Your Programs</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {programs.map(program => {
              const compliance = calculateComplianceStatus(program.children, {
                programType: program.programType,
                totalCapacity: program.totalCapacity,
              });

              return (
                <button
                  key={program.id}
                  onClick={() => {
                    onSelect(program.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 ${
                    program.id === activeProgram?.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{program.name}</p>
                    <p className="text-xs text-gray-500">
                      {program.programType === 'small_family' ? 'Small' : 'Large'} Family
                      {' · '}
                      {compliance.totalChildren}/{program.totalCapacity} enrolled
                    </p>
                  </div>
                  {!compliance.isCompliant && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">!</span>
                  )}
                  {program.id === activeProgram?.id && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-gray-100">
            <button
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
            >
              <Plus size={16} />
              Add New Program
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
