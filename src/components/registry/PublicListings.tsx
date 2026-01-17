import { useState } from 'react';
import { PublicListing, SearchFilters, SF_NEIGHBORHOODS, LANGUAGES } from '../../types/registry';
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Star,
  Filter,
  X,
  Baby,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PublicListingsProps {
  listings: PublicListing[];
  loading?: boolean;
}

export function PublicListings({ listings, loading }: PublicListingsProps) {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedListing, setExpandedListing] = useState<string | null>(null);

  const filteredListings = listings.filter(listing => {
    if (filters.zip_code && !listing.zip_code.startsWith(filters.zip_code)) {
      return false;
    }
    if (filters.neighborhood && listing.neighborhood !== filters.neighborhood) {
      return false;
    }
    if (filters.elfa_only && !listing.is_elfa_network) {
      return false;
    }
    if (filters.language) {
      const langs = Array.isArray(listing.languages)
        ? listing.languages
        : JSON.parse(listing.languages as unknown as string);
      if (!langs.includes(filters.language)) {
        return false;
      }
    }
    if (filters.age_group) {
      switch (filters.age_group) {
        case 'infant':
          if (!listing.accepting_infants) return false;
          break;
        case 'toddler':
          if (!listing.accepting_toddlers) return false;
          break;
        case 'preschool':
          if (!listing.accepting_preschool) return false;
          break;
        case 'school_age':
          if (!listing.accepting_school_age) return false;
          break;
      }
    }
    if (filters.schedule === 'full_time' && !listing.full_time_available) {
      return false;
    }
    if (filters.schedule === 'part_time' && !listing.part_time_available) {
      return false;
    }
    return true;
  });

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                SF Family Child Care Vacancies
              </h1>
              <p className="text-gray-600 text-sm">
                Find available childcare spots in San Francisco
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{filteredListings.length}</p>
              <p className="text-sm text-gray-500">programs with openings</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ZIP code (e.g., 94110)"
                value={filters.zip_code || ''}
                onChange={e => setFilters(prev => ({ ...prev, zip_code: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
                hasActiveFilters
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter size={18} />
              Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                  {Object.values(filters).filter(v => v).length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">Filter Results</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <X size={14} />
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Neighborhood */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Neighborhood
                  </label>
                  <select
                    value={filters.neighborhood || ''}
                    onChange={e => setFilters(prev => ({ ...prev, neighborhood: e.target.value || undefined }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  >
                    <option value="">Any</option>
                    {SF_NEIGHBORHOODS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Age Group */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Age Group
                  </label>
                  <select
                    value={filters.age_group || ''}
                    onChange={e => setFilters(prev => ({
                      ...prev,
                      age_group: (e.target.value || undefined) as SearchFilters['age_group']
                    }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  >
                    <option value="">Any age</option>
                    <option value="infant">Infant (under 2)</option>
                    <option value="toddler">Toddler (2-3)</option>
                    <option value="preschool">Preschool (3-5)</option>
                    <option value="school_age">School Age (6+)</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Language
                  </label>
                  <select
                    value={filters.language || ''}
                    onChange={e => setFilters(prev => ({ ...prev, language: e.target.value || undefined }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  >
                    <option value="">Any</option>
                    {LANGUAGES.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Schedule */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Schedule
                  </label>
                  <select
                    value={filters.schedule || ''}
                    onChange={e => setFilters(prev => ({
                      ...prev,
                      schedule: (e.target.value || undefined) as SearchFilters['schedule']
                    }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  >
                    <option value="">Any</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                  </select>
                </div>

                {/* ELFA */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    ELFA Network
                  </label>
                  <label className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      checked={filters.elfa_only || false}
                      onChange={e => setFilters(prev => ({ ...prev, elfa_only: e.target.checked || undefined }))}
                      className="rounded"
                    />
                    <span className="text-sm">Only ELFA programs</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Listings */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading listings...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <Baby size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your filters or search</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map(listing => (
              <div
                key={listing.provider_id}
                className="bg-white rounded-xl shadow hover:shadow-md transition-shadow"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedListing(
                    expandedListing === listing.provider_id ? null : listing.provider_id
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{listing.business_name}</h3>
                        {listing.is_elfa_network && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                            <Star size={12} />
                            ELFA
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {listing.neighborhood || listing.zip_code}
                        </span>
                        <span>
                          {listing.program_type === 'small_family' ? 'Small' : 'Large'} Family
                        </span>
                        <span className="text-gray-400">
                          License #{listing.license_number}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {listing.total_spots_available}
                        </p>
                        <p className="text-xs text-gray-500">spots open</p>
                      </div>
                      {expandedListing === listing.provider_id ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Quick spots overview */}
                  <div className="flex gap-2 mt-3">
                    {listing.accepting_infants && (
                      <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded">
                        Infant{listing.infant_spots > 0 && ` (${listing.infant_spots})`}
                      </span>
                    )}
                    {listing.accepting_toddlers && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                        Toddler{listing.toddler_spots > 0 && ` (${listing.toddler_spots})`}
                      </span>
                    )}
                    {listing.accepting_preschool && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        Preschool{listing.preschool_spots > 0 && ` (${listing.preschool_spots})`}
                      </span>
                    )}
                    {listing.accepting_school_age && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        School Age{listing.school_age_spots > 0 && ` (${listing.school_age_spots})`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedListing === listing.provider_id && (
                  <div className="px-4 pb-4 pt-2 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Contact</h4>
                        <div className="space-y-2 text-sm">
                          {listing.phone && (
                            <a
                              href={`tel:${listing.phone}`}
                              className="flex items-center gap-2 text-blue-600 hover:underline"
                            >
                              <Phone size={14} />
                              {listing.phone}
                            </a>
                          )}
                          <a
                            href={`mailto:${listing.contact_email}`}
                            className="flex items-center gap-2 text-blue-600 hover:underline"
                          >
                            <Mail size={14} />
                            {listing.contact_email}
                          </a>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center gap-2">
                            <Clock size={14} />
                            {[
                              listing.full_time_available && 'Full-time',
                              listing.part_time_available && 'Part-time'
                            ].filter(Boolean).join(', ') || 'Contact for schedule'}
                          </p>
                          {listing.languages.length > 0 && (
                            <p>Languages: {listing.languages.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-4">
                      Last updated {formatDistanceToNow(new Date(listing.last_updated), { addSuffix: true })}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-8 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>
            A service of the San Francisco Family Child Care Association
          </p>
          <p className="mt-1">
            Are you a licensed FCC provider?{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Report your vacancies
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
