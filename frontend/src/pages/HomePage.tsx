import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, ShieldCheck, Sparkles, Compass } from 'lucide-react';
import { PropertyCard } from '../components/PropertyCard';
import { useSearchStore } from '../store/searchStore';
import { apiClient } from '../api/client';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { city, setFilter } = useSearchStore();
  const [searchQuery, setSearchQuery] = useState(city);
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProperties();
  }, []);

  const fetchFeaturedProperties = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/properties?limit=6');
      setFeaturedProperties(res.data.data);
    } catch {
      setFeaturedProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter('city', searchQuery);
    navigate('/search');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative min-h-[85vh] flex items-center justify-center px-6 overflow-hidden">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=2000&q=80"
            alt="Luxury Villa"
            className="w-full h-full object-cover scale-105 filter brightness-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07090e]/60 via-[#07090e]/80 to-[#07090e]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4" /> HoyHel — Find Home Anywhere.
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Reserve Extraordinary Stays <br />
            <span className="text-gradient">Around The Globe</span>
          </h1>

          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Handpicked cliffside estates, architectural penthouses, and private mountain retreats crafted for unforgettable travel experiences.
          </p>

          {/* Search Bar Widget */}
          <form
            onSubmit={handleSearchSubmit}
            className="glass-panel p-3 rounded-2xl md:rounded-full border border-slate-700/80 shadow-2xl flex flex-col md:flex-row items-center gap-3 max-w-4xl mx-auto"
          >
            <div className="flex-1 w-full flex items-center gap-3 px-4 py-2 border-b md:border-b-0 md:border-r border-slate-800">
              <MapPin className="w-5 h-5 text-sky-400 shrink-0" />
              <div className="text-left w-full">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</label>
                <input
                  type="text"
                  placeholder="Where to? (e.g., Malibu, Aspen)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-500 font-medium"
                />
              </div>
            </div>

            <div className="flex-1 w-full flex items-center gap-3 px-4 py-2 border-b md:border-b-0 md:border-r border-slate-800">
              <Calendar className="w-5 h-5 text-sky-400 shrink-0" />
              <div className="text-left w-full">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Dates</label>
                <span className="text-sm text-slate-300 font-medium">Select Check-in & Out</span>
              </div>
            </div>

            <div className="flex-1 w-full flex items-center gap-3 px-4 py-2">
              <Users className="w-5 h-5 text-sky-400 shrink-0" />
              <div className="text-left w-full">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Guests</label>
                <span className="text-sm text-slate-300 font-medium">2 Guests</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-8 py-3.5 rounded-xl md:rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 transition-all shrink-0"
            >
              <Search className="w-4 h-4" /> Search
            </button>
          </form>
        </div>
      </div>

      {/* Featured Properties Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Featured Luxury Listings
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Hand-selected for architectural excellence and luxury amenities.
            </p>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="text-xs font-bold text-sky-400 hover:underline flex items-center gap-1"
          >
            Explore All Properties &rarr;
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-slate-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
