import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Search, MapPin, Users, MessageSquare, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { getImageUrl } from '../utils/imageUtils';
import { useAuthStore } from '../store/authStore';

export const HostBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [contactingId, setContactingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHostBookings();
  }, []);

  const fetchHostBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/bookings/user?role=host');
      setBookings(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load property bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleMessageGuest = async (booking: any) => {
    if (!booking?.guest?.id) return;
    try {
      setContactingId(booking.id);
      const res = await apiClient.post('/messaging/conversations', {
        guestId: booking.guest.id,
        propertyId: booking.propertyId,
        bookingId: booking.id,
      });
      const convId = res.data.data?.id;
      if (convId) {
        navigate(`/messages?conversationId=${convId}`);
      } else {
        navigate('/messages');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to open conversation with guest.');
    } finally {
      setContactingId(null);
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
            <Calendar className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Property Bookings</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage guest reservations for your listed properties</p>
          </div>
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

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="glass-panel p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-800">
          Loading property bookings...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 max-w-lg mx-auto">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No property bookings found</h3>
          <p className="text-xs text-slate-400">There are currently no guest reservations for this filter.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-bold">Booking ID</th>
                  <th className="py-3.5 px-4 font-bold">Guest</th>
                  <th className="py-3.5 px-4 font-bold">Property</th>
                  <th className="py-3.5 px-4 font-bold">Dates & Stay</th>
                  <th className="py-3.5 px-4 font-bold">Total Earnings</th>
                  <th className="py-3.5 px-4 font-bold">Payment</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-sky-400 text-[11px]">
                      {booking.bookingNumber}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={booking.guest?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                          alt="Guest"
                          className="w-7 h-7 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-white text-xs">{booking.guest?.firstName} {booking.guest?.lastName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-white line-clamp-1 max-w-[220px]">{booking.property?.title || booking.propertyName}</div>
                      <div className="text-[10px] text-slate-400">{booking.property?.city || 'City'}</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-200">{new Date(booking.checkIn).toLocaleDateString()} &rarr; {new Date(booking.checkOut).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">{booking.nights} nights &bull; {booking.guestsCount} guests</div>
                    </td>
                    <td className="py-4 px-4 font-extrabold text-emerald-400 text-sm">
                      ${booking.totalPrice?.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {booking.payment?.status || 'SUCCESS'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleMessageGuest(booking)}
                        disabled={contactingId === booking.id}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white font-bold text-xs border border-sky-500/30 inline-flex items-center gap-1 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Message Guest
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
