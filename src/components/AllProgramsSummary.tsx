import { Program } from '../types';
import { calculateComplianceStatus } from '../utils/compliance';
import { calculateProjectedOpenings } from '../utils/projections';
import { format } from 'date-fns';
import { Building2, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

interface AllProgramsSummaryProps {
  programs: Program[];
  onSelectProgram: (programId: string) => void;
}

export function AllProgramsSummary({ programs, onSelectProgram }: AllProgramsSummaryProps) {
  if (programs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Programs Yet</h3>
        <p className="text-gray-500">Create your first program to get started.</p>
      </div>
    );
  }

  // Calculate totals
  const totals = programs.reduce(
    (acc, program) => {
      const compliance = calculateComplianceStatus(program.children, {
        programType: program.programType,
        totalCapacity: program.totalCapacity,
      });
      return {
        totalChildren: acc.totalChildren + compliance.totalChildren,
        totalCapacity: acc.totalCapacity + program.totalCapacity,
        totalInfants: acc.totalInfants + compliance.infantCount,
        programsWithIssues: acc.programsWithIssues + (compliance.isCompliant ? 0 : 1),
      };
    },
    { totalChildren: 0, totalCapacity: 0, totalInfants: 0, programsWithIssues: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Programs</p>
          <p className="text-2xl font-bold text-gray-900">{programs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Children</p>
          <p className="text-2xl font-bold text-gray-900">
            {totals.totalChildren}
            <span className="text-sm font-normal text-gray-500"> / {totals.totalCapacity}</span>
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Infants</p>
          <p className="text-2xl font-bold text-gray-900">{totals.totalInfants}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            {totals.programsWithIssues > 0 ? (
              <AlertTriangle size={20} className="text-red-500" />
            ) : (
              <CheckCircle size={20} className="text-green-500" />
            )}
            <div>
              <p className="text-sm text-gray-500">Compliance</p>
              <p className="text-lg font-bold text-gray-900">
                {totals.programsWithIssues > 0
                  ? `${totals.programsWithIssues} issue${totals.programsWithIssues > 1 ? 's' : ''}`
                  : 'All Good'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Program Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {programs.map(program => {
          const compliance = calculateComplianceStatus(program.children, {
            programType: program.programType,
            totalCapacity: program.totalCapacity,
          });
          const projections = calculateProjectedOpenings(program.children, 3);
          const nextChange = projections[0];

          return (
            <div
              key={program.id}
              className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-l-4 ${
                compliance.isCompliant ? 'border-green-500' : 'border-red-500'
              }`}
              onClick={() => onSelectProgram(program.id)}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{program.name}</h3>
                    <p className="text-xs text-gray-500">
                      {program.programType === 'small_family' ? 'Small' : 'Large'} Family
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">Enrolled</p>
                    <p className="font-semibold text-gray-900">
                      {compliance.totalChildren}/{program.totalCapacity}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">Infants</p>
                    <p className="font-semibold text-gray-900">
                      {compliance.infantCount}/{compliance.maxInfantsAllowed}
                    </p>
                  </div>
                </div>

                {!compliance.isCompliant && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mb-3">
                    <AlertTriangle size={14} />
                    <span>Compliance issue</span>
                  </div>
                )}

                {compliance.totalSpotsAvailable > 0 && (
                  <p className="text-sm text-green-600">
                    {compliance.totalSpotsAvailable} spot{compliance.totalSpotsAvailable > 1 ? 's' : ''} available
                    {compliance.infantSpotsAvailable > 0 && (
                      <span className="text-gray-500">
                        {' '}({compliance.infantSpotsAvailable} for infants)
                      </span>
                    )}
                  </p>
                )}

                {compliance.totalSpotsAvailable === 0 && nextChange && (
                  <p className="text-sm text-gray-500">
                    Next opening: {format(new Date(nextChange.date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
