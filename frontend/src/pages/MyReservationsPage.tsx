import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Compass, ChevronRight, AlertCircle, Clock, ShieldCheck, DollarSign } from 'lucide-react';
import { apiClient } from '../api/client';
import { getImageUrl } from '../utils/imageUtils';
import { useAuthStore } from '../store/authStore';

export const MyReservationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    const roles = user?.roles || [user?.role || 'GUEST'];
    if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
      navigate('/admin/bookings', { replace: true });
      return;
    }
    fetchReservations();
  }, [user, navigate]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/bookings/my?role=guest');
      setBookings(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load your reservations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const getFiltered = (tab: typeof activeTab) => {
    return bookings.filter((b) => {
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);

      if (tab === 'UPCOMING') {
        return (b.status === 'CONFIRMED' || b.status === 'PENDING') && checkOut >= now;
      }
      if (tab === 'ACTIVE') {
        return (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && checkIn <= now && checkOut >= now;
      }
      if (tab === 'COMPLETED') {
        return b.status === 'COMPLETED' || (checkOut < now && b.status !== 'CANCELLED' && b.status !== 'REFUNDED');
      }
      if (tab === 'CANCELLED') {
        return b.status === 'CANCELLED' || b.status === 'REFUNDED' || b.status === 'REJECTED';
      }
      return true;
    });
  };

  const filteredBookings = getFiltered(activeTab);

  const getTabCount = (tab: typeof activeTab) => {
    if (tab === 'ALL') return bookings.length;
    return getFiltered(tab).length;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Confirmed</span>;
      case 'COMPLETED':
        return <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 font-extrabold text-[10px] uppercase tracking-wider">Completed</span>;
      case 'PENDING':
      case 'PENDING_PAYMENT':
        return <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Pending Payment Hold</span>;
      case 'EXPIRED':
        return <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Expired Hold</span>;
      case 'CANCELLED':
      case 'REFUNDED':
        return <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-extrabold text-[10px] uppercase tracking-wider">Cancelled</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-extrabold text-[10px] uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Reservations</h1>
          <p className="text-xs text-slate-400 mt-1">View and manage the homes you've reserved with HoyHel.</p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-1.5 glass-panel rounded-xl border border-slate-800 text-xs overflow-x-auto">
          {(['ALL', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all capitalize whitespace-nowrap ${
                activeTab === tab ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.toLowerCase()} ({getTabCount(tab)})
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchReservations} className="font-bold underline hover:text-rose-300">
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-5 rounded-2xl border border-slate-800/80 animate-pulse space-y-4">
              <div className="h-44 bg-slate-900 rounded-xl" />
              <div className="h-5 bg-slate-900 rounded w-3/4" />
              <div className="h-4 bg-slate-900 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Empty State */
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center max-w-lg mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-sky-400">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">You don't have any reservations yet</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Find a place you'll love and book your next stay with HoyHel.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-sky-500/20 transition-all inline-flex items-center gap-2"
          >
            <Compass className="w-4 h-4" /> Explore Properties
          </button>
        </div>
      ) : (
        /* Reservation Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBookings.map((booking) => {
            const prop = booking.property;
            const mainImg = prop?.images?.[0]?.url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';
            const checkInFormatted = new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const checkOutFormatted = new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div
                key={booking.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Property Image & Status Header */}
                  <div className="relative h-48 rounded-xl overflow-hidden mb-4">
                    <img
                      src={getImageUrl(mainImg)}
                      alt={prop?.title || booking.propertyName || 'Property'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700/60 text-[11px] font-bold text-white">
                      #{booking.bookingNumber}
                    </div>
                  </div>

                  {/* Title & Location */}
                  <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors mb-1 line-clamp-1">
                    {prop?.title || booking.propertyName || 'Reserved Home'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{prop?.city || 'Location'}, {prop?.country || 'Kenya'}</span>
                  </div>

                  {/* Dates & Guest Summary */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs mb-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Check-In</span>
                      <span className="font-semibold text-slate-200">{checkInFormatted}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Check-Out</span>
                      <span className="font-semibold text-slate-200">{checkOutFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Price & View Details CTA */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Price</span>
                    <span className="text-lg font-extrabold text-white">${booking.totalPrice?.toLocaleString()} USD</span>
                    <span className="text-[10px] text-slate-400 ml-1">({booking.nights} nights &bull; {booking.guestsCount} guests)</span>
                  </div>

                  <button
                    onClick={() => navigate(`/reservations/${booking.id}`)}
                    className="px-4 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white font-extrabold text-xs flex items-center gap-1 transition-all border border-sky-500/30"
                  >
                    View Details <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
