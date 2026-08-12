import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, MapPin, DollarSign, Users, Sparkles } from 'lucide-react';
import { PropertyCard } from '../components/PropertyCard';
import { useSearchStore } from '../store/searchStore';
import { apiClient } from '../api/client';

export const SearchPage: React.FC = () => {
  const { city, propertyType, minPrice, maxPrice, setFilter } = useSearchStore();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(city || '');
  const [sortBy, setSortBy] = useState<'RECOMMENDED' | 'PRICE_ASC' | 'PRICE_DESC' | 'RATING'>('RECOMMENDED');
  const [guestsFilter, setGuestsFilter] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchFilteredProperties();
  }, [city, propertyType, minPrice, maxPrice, guestsFilter]);

  const fetchFilteredProperties = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/properties', {
        params: {
          city: city || undefined,
          propertyType: propertyType || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          guests: guestsFilter || undefined,
          limit: 50,
        },
      });
      setProperties(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Client-side sorting
  const sortedProperties = [...properties].sort((a, b) => {
    if (sortBy === 'PRICE_ASC') return a.basePrice - b.basePrice;
    if (sortBy === 'PRICE_DESC') return b.basePrice - a.basePrice;
    if (sortBy === 'RATING') return b.averageRating - a.averageRating;
    return 0; // RECOMMENDED
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header Search & Filter Toolbar */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 mb-8 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <MapPin className="w-4 h-4 text-sky-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Search destination city or country..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setFilter('city', searchInput)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <select
              value={propertyType || ''}
              onChange={(e) => setFilter('propertyType', e.target.value || undefined)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Property Types</option>
              <option value="VILLA">Villa</option>
              <option value="APARTMENT">Apartment / Penthouse</option>
              <option value="HOUSE">House / Chalet</option>
              <option value="HOTEL">Hotel Suite</option>
            </select>
          </div>

          <div>
            <select
              value={guestsFilter || ''}
              onChange={(e) => setGuestsFilter(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">Any Capacity</option>
              <option value="2">2+ Guests</option>
              <option value="4">4+ Guests</option>
              <option value="6">6+ Guests</option>
              <option value="8">8+ Guests</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <span className="font-bold text-slate-300 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Max Nightly Rate:
            </span>
            <input
              type="range"
              min="100"
              max="3000"
              step="50"
              value={maxPrice || 3000}
              onChange={(e) => setFilter('maxPrice', Number(e.target.value))}
              className="w-48 accent-sky-500 cursor-pointer"
            />
            <span className="font-extrabold text-sky-400 font-mono">${maxPrice || 3000}</span>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <span className="font-bold text-slate-400">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="RECOMMENDED">Recommended Stays</option>
              <option value="PRICE_ASC">Price: Low &rarr; High</option>
              <option value="PRICE_DESC">Price: High &rarr; Low</option>
              <option value="RATING">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Title Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-400" />
          {sortedProperties.length} Luxury Stays Found
        </h2>
      </div>

      {/* Properties Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : sortedProperties.length === 0 ? (
        <div className="glass-panel p-12 text-center text-xs text-slate-400 rounded-3xl border border-slate-800 max-w-xl mx-auto">
          No luxury properties match your selected search criteria.
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchInput('');
                setFilter('city', undefined);
                setFilter('propertyType', undefined);
                setFilter('maxPrice', undefined);
                setGuestsFilter(undefined);
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {sortedProperties.map((prop) => (
            <PropertyCard key={prop.id} property={prop} />
          ))}
        </div>
      )}
    </div>
  );
};
