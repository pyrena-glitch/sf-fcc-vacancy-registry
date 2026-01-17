import { Child, CapacityConfig } from '../../types';
import { calculateProjectedOpenings } from '../../utils/projections';
import { Users, TrendingUp, Wand2 } from 'lucide-react';
import { format } from 'date-fns';

interface RosterSummaryProps {
  children: Child[];
  capacityConfig: CapacityConfig;
  onAutoFill?: (data: {
    infant_spots: number;
    toddler_spots: number;
    preschool_spots: number;
    school_age_spots: number;
  }) => void;
}

// Get age in months from DOB
function getAgeInMonths(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  return (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
}

// Detailed age group for vacancy form (different from regulatory groups)
function getDetailedAgeGroup(dob: string): 'infant' | 'toddler' | 'preschool' | 'school_age' {
  const months = getAgeInMonths(dob);
  if (months < 24) return 'infant';      // Under 2
  if (months < 36) return 'toddler';     // 2-3 years
  if (months < 72) return 'preschool';   // 3-6 years
  return 'school_age';                    // 6+ years
}

export function RosterSummary({ children, capacityConfig, onAutoFill }: RosterSummaryProps) {
  const projections = calculateProjectedOpenings(children, 6);

  // Count children by detailed age groups
  const ageCounts = {
    infant: children.filter(c => getDetailedAgeGroup(c.dateOfBirth) === 'infant').length,
    toddler: children.filter(c => getDetailedAgeGroup(c.dateOfBirth) === 'toddler').length,
    preschool: children.filter(c => getDetailedAgeGroup(c.dateOfBirth) === 'preschool').length,
    school_age: children.filter(c => getDetailedAgeGroup(c.dateOfBirth) === 'school_age').length,
  };

  const totalEnrolled = children.length;
  const totalCapacity = capacityConfig.totalCapacity;
  const totalAvailable = Math.max(0, totalCapacity - totalEnrolled);

  // Calculate infant limit AT FULL CAPACITY per CA Regulation 102416.5
  // Large Family: 1-12 children = max 4 infants, 13-14 children = max 3 infants
  // Small Family: 1-4 = max 4, 5-6 = max 3, 7-8 = max 2
  const programType = capacityConfig.programType;
  const atCapacityInfantLimit = programType === 'small_family'
    ? (totalCapacity <= 4 ? 4 : totalCapacity <= 6 ? 3 : 2)
    : (totalCapacity <= 12 ? 4 : 3);
  const infantAvailable = Math.max(0, Math.min(
    atCapacityInfantLimit - ageCounts.infant,
    totalAvailable
  ));

  const handleAutoFill = () => {
    if (!onAutoFill) return;

    // CA Regulation 102416.5 - infant limits depend on TOTAL children at capacity
    // Large Family: 1-12 children = max 4 infants, 13-14 children = max 3 infants
    // Small Family: 1-4 = max 4, 5-6 = max 3, 7-8 = max 2
    //
    // For vacancy reporting, we need infant limit AT FULL CAPACITY
    const programType = capacityConfig.programType;
    const atCapacityInfantLimit = programType === 'small_family'
      ? (totalCapacity <= 4 ? 4 : totalCapacity <= 6 ? 3 : 2)
      : (totalCapacity <= 12 ? 4 : 3);

    // Current infants already enrolled
    const currentInfants = ageCounts.infant;

    // Infant spots = limit at capacity minus current infants
    const infantSpotsAvailable = Math.max(0, Math.min(
      atCapacityInfantLimit - currentInfants,
      totalAvailable
    ));

    // Remaining spots go to non-infant age groups
    const remainingSpots = Math.max(0, totalAvailable - infantSpotsAvailable);
    const spotsPerGroup = Math.floor(remainingSpots / 3);
    const extraSpots = remainingSpots % 3;

    // Distribute evenly: toddler gets extras first, then preschool
    onAutoFill({
      infant_spots: infantSpotsAvailable,
      toddler_spots: spotsPerGroup + (extraSpots >= 1 ? 1 : 0),
      preschool_spots: spotsPerGroup + (extraSpots >= 2 ? 1 : 0),
      school_age_spots: spotsPerGroup,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users size={24} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Current Roster Status</h2>
            <p className="text-sm text-gray-500">Based on your enrolled children</p>
          </div>
        </div>
        {children.length === 0 && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            No children in roster
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900">{totalEnrolled}</p>
          <p className="text-xs text-gray-500">Enrolled</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900">{totalCapacity}</p>
          <p className="text-xs text-gray-500">Capacity</p>
        </div>
        <div className={`p-3 rounded-lg text-center ${totalAvailable > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
          <p className={`text-2xl font-bold ${totalAvailable > 0 ? 'text-green-600' : 'text-gray-400'}`}>
            {totalAvailable}
          </p>
          <p className="text-xs text-gray-500">Available</p>
        </div>
      </div>

      {/* Breakdown by age group - matches vacancy form */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="p-2 bg-pink-50 rounded-lg text-center border border-pink-200">
          <p className="text-lg font-bold text-pink-700">{ageCounts.infant}</p>
          <p className="text-xs text-pink-600">Infant</p>
          <p className="text-xs text-pink-400">Under 2</p>
        </div>
        <div className="p-2 bg-orange-50 rounded-lg text-center border border-orange-200">
          <p className="text-lg font-bold text-orange-700">{ageCounts.toddler}</p>
          <p className="text-xs text-orange-600">Toddler</p>
          <p className="text-xs text-orange-400">2-3 yrs</p>
        </div>
        <div className="p-2 bg-green-50 rounded-lg text-center border border-green-200">
          <p className="text-lg font-bold text-green-700">{ageCounts.preschool}</p>
          <p className="text-xs text-green-600">Preschool</p>
          <p className="text-xs text-green-400">3-5 yrs</p>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg text-center border border-blue-200">
          <p className="text-lg font-bold text-blue-700">{ageCounts.school_age}</p>
          <p className="text-xs text-blue-600">School Age</p>
          <p className="text-xs text-blue-400">6+ yrs</p>
        </div>
      </div>

      {/* Infant compliance note */}
      {infantAvailable > 0 && (
        <div className="text-xs text-pink-600 bg-pink-50 p-2 rounded mb-4">
          <span className="font-medium">Infant spots available:</span> {infantAvailable} (per CA regulations)
        </div>
      )}

      {/* Upcoming openings */}
      {projections.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Upcoming Openings (Next 6 Months)</span>
          </div>
          <div className="space-y-1">
            {projections.slice(0, 3).map((p, i) => (
              <div key={i} className="text-sm text-gray-600 flex justify-between">
                <span>{p.childName} ({p.reason.replace(/_/g, ' ')})</span>
                <span className="text-gray-400">{format(new Date(p.date), 'MMM d, yyyy')}</span>
              </div>
            ))}
            {projections.length > 3 && (
              <p className="text-xs text-gray-400">+{projections.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* Auto-fill button */}
      {onAutoFill && (
        <div className="border-t pt-4 mt-4">
          <button
            onClick={handleAutoFill}
            disabled={totalAvailable === 0}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              totalAvailable > 0
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Wand2 size={16} />
            {totalAvailable > 0
              ? 'Auto-fill vacancy form from roster'
              : 'No available spots to report'}
          </button>
          {totalAvailable > 0 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              This will update the form below based on your current roster
            </p>
          )}
        </div>
      )}

      {children.length === 0 && (
        <div className="text-center py-2 text-gray-500 text-sm border-t mt-4 pt-4">
          <p>Add children to your <strong>Roster</strong> to see capacity analysis</p>
        </div>
      )}
    </div>
  );
}
