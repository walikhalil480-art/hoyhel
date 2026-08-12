import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Heart, MessageSquare, Star, CheckCircle2, XCircle, AlertTriangle, Compass, Eye, Clock } from 'lucide-react';
import { apiClient } from '../api/client';
import { ReviewModal } from '../components/ReviewModal';
import { getImageUrl } from '../utils/imageUtils';

export const GuestDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAST' | 'CANCELLED' | 'FAVORITES'>('UPCOMING');
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<any>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchGuestData();
  }, []);

  const fetchGuestData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, favsRes] = await Promise.all([
        apiClient.get('/bookings/user?role=guest'),
        apiClient.get('/favorites'),
      ]);
      setBookings(bookingsRes.data.data || []);
      setFavorites(favsRes.data.data || []);
    } catch {
      setBookings([]);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const reason = prompt('Please enter your cancellation reason:');
    if (reason === null) return;

    try {
      setCancellingId(bookingId);
      const res = await apiClient.post(`/bookings/${bookingId}/cancel`, { reason });
      alert(`Booking cancelled. Refund eligible: $${res.data.data.eligibleRefund} (${res.data.data.refundPercent}%)`);
      fetchGuestData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const removeFavorite = async (propertyId: string) => {
    try {
      await apiClient.delete(`/favorites/${propertyId}`);
      setFavorites((prev) => prev.filter((f) => f.propertyId !== propertyId));
    } catch {
      // Fallback
    }
  };

  // Filter bookings by status and date
  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => b.status !== 'CANCELLED' && b.status !== 'REFUNDED' && new Date(b.checkOut) >= now
  );
  const pastBookings = bookings.filter(
    (b) => (b.status === 'COMPLETED' || new Date(b.checkOut) < now) && b.status !== 'CANCELLED'
  );
  const cancelledBookings = bookings.filter(
    (b) => b.status === 'CANCELLED' || b.status === 'REFUNDED'
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">My Guest Account</h1>
            <Link
              to="/my-reservations"
              className="px-3.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 font-extrabold text-xs hover:bg-sky-500 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" /> View All Reservations
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-1">Manage upcoming stays, historical trips, saved properties, and reviews</p>
        </div>

        <div className="flex items-center gap-2 p-1.5 glass-panel rounded-xl border border-slate-800 text-xs self-start md:self-auto">
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'UPCOMING' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('PAST')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'PAST' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Past Stays ({pastBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('CANCELLED')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'CANCELLED' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cancelled ({cancelledBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('FAVORITES')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              activeTab === 'FAVORITES' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Favorites ({favorites.length})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading trip details...</div>
        ) : activeTab === 'FAVORITES' ? (
          favorites.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <Heart className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              You haven't saved any favorite properties yet.
              <div className="mt-4">
                <Link to="/search" className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs inline-block">
                  Explore Stays
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {favorites.map((fav) => (
                <div key={fav.id} className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col group">
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    <img
                      src={getImageUrl(fav.property?.images?.[0]?.url)}
                      alt={fav.property?.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <button
                      onClick={() => removeFavorite(fav.propertyId)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-rose-500"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm line-clamp-1">{fav.property?.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{fav.property?.city}, {fav.property?.country}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="font-extrabold text-emerald-400 text-sm">${fav.property?.basePrice}/night</span>
                      <Link to={`/properties/${fav.propertyId}`} className="text-xs font-bold text-sky-400 hover:underline">
                        View Property &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          (() => {
            const list = activeTab === 'UPCOMING' ? upcomingBookings : activeTab === 'PAST' ? pastBookings : cancelledBookings;

            if (list.length === 0) {
              return (
                <div className="p-12 text-center text-xs text-slate-400">
                  <Compass className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  No {activeTab.toLowerCase()} trips found.
                  <div className="mt-4">
                    <Link to="/search" className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs inline-block">
                      Find Next Luxury Destination
                    </Link>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {list.map((booking) => (
                  <div key={booking.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-4">
                      <img
                        src={getImageUrl(booking.property?.images?.[0]?.url)}
                        alt={booking.property?.title}
                        className="w-24 h-20 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div>
                        <span className="text-[10px] font-extrabold text-sky-400 font-mono tracking-widest">{booking.bookingNumber}</span>
                        <h3 className="text-base font-extrabold text-white line-clamp-1">{booking.property?.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(booking.checkIn).toLocaleDateString()} &mdash; {new Date(booking.checkOut).toLocaleDateString()} ({booking.nights} nights)
                        </p>
                        <p className="text-[11px] text-slate-400">{booking.property?.city}, {booking.property?.country}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-0 border-slate-800">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Total Price</span>
                        <span className="text-lg font-extrabold text-emerald-400">${booking.totalPrice?.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeTab === 'UPCOMING' && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={cancellingId === booking.id}
                            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 transition-colors"
                          >
                            Cancel Stay
                          </button>
                        )}

                        {activeTab === 'PAST' && !booking.review && (
                          <button
                            onClick={() => setSelectedReviewBooking(booking)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
                          >
                            <Star className="w-3.5 h-3.5 fill-current" /> Leave Review
                          </button>
                        )}

                        <Link
                          to={`/properties/${booking.propertyId}`}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs transition-colors"
                        >
                          View Stay
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* Review Modal Trigger */}
      {selectedReviewBooking && (
        <ReviewModal
          booking={selectedReviewBooking}
          onClose={() => setSelectedReviewBooking(null)}
          onSuccess={() => {
            alert('Review submitted successfully!');
            fetchGuestData();
          }}
        />
      )}
    </div>
  );
};
