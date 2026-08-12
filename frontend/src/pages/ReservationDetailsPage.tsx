import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar, MapPin, Users, MessageSquare, ShieldCheck, Clock, DollarSign,
  ArrowLeft, CreditCard, ChevronLeft, ChevronRight, X, AlertCircle, Award, Star, RefreshCw
} from 'lucide-react';
import { apiClient } from '../api/client';
import { getImageUrl } from '../utils/imageUtils';
import { ReviewModal } from '../components/ReviewModal';

export const ReservationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    if (id) fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/bookings/${id}`);
      setBooking(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access denied. You are not authorized to view this reservation.');
      } else {
        setError(err.response?.data?.message || 'Failed to load reservation details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContactHost = async () => {
    const hostId = booking?.property?.host?.id || booking?.property?.hostId;
    if (!hostId) return;

    try {
      setContacting(true);
      const res = await apiClient.post('/messaging/conversations', {
        hostId,
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
      alert(err.response?.data?.message || 'Failed to open conversation with host.');
    } finally {
      setContacting(false);
    }
  };

  const handleCancelBooking = async () => {
    const reason = prompt('Please enter your cancellation reason:');
    if (reason === null) return;

    try {
      setCancelling(true);
      const res = await apiClient.post(`/bookings/${booking.id}/cancel`, { reason });
      alert(`Reservation cancelled successfully. Eligible refund: $${res.data.data.eligibleRefund} (${res.data.data.refundPercent}%)`);
      fetchBookingDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel reservation');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-sky-500 border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-xs font-semibold text-slate-400">Loading reservation details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Reservation Access Error</h2>
          <p className="text-xs text-slate-400 mb-6">{error || 'Reservation not found.'}</p>
          <button
            onClick={() => navigate('/my-reservations')}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to My Reservations
          </button>
        </div>
      </div>
    );
  }

  const prop = booking.property;
  const host = prop?.host || booking.host;
  const images = prop?.images || [];
  const mainImage = images[selectedImgIdx]?.url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80';

  const checkInFormatted = new Date(booking.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const checkOutFormatted = new Date(booking.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const isCompleted = booking.status === 'COMPLETED';
  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'REFUNDED';
  const isPending = booking.status === 'PENDING';
  const isPropertyInactive = prop && prop.status !== 'PUBLISHED';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Top Breadcrumb Navigation */}
      <button
        onClick={() => navigate('/my-reservations')}
        className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Reservations
      </button>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-sky-400">Reservation #{booking.bookingNumber}</span>
            {isPropertyInactive && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                Archived Listing
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-white">{prop?.title || booking.propertyName || 'Reserved Property'}</h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            {prop?.address || booking.propertyAddress || 'Property Location'}
          </p>
        </div>

        {/* Status Badge & Primary Action */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">Booking Status</span>
            <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-extrabold uppercase mt-1 ${
              booking.status === 'CONFIRMED' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
              booking.status === 'COMPLETED' ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400' :
              isCancelled ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' :
              'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}>
              {booking.status}
            </span>
          </div>

          {host && (
            <button
              onClick={handleContactHost}
              disabled={contacting}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all"
            >
              <MessageSquare className="w-4 h-4" /> Message Host
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Gallery, Property Info, Stay Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Gallery Section */}
          <div className="space-y-3">
            <div className="relative h-96 rounded-2xl overflow-hidden border border-slate-800 group">
              <img
                src={getImageUrl(mainImage)}
                alt="Property Main"
                className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                onClick={() => setLightboxOpen(true)}
              />
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-4 right-4 px-4 py-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 text-xs font-bold text-white hover:bg-slate-900 transition-colors"
              >
                View Full Gallery ({images.length || 1})
              </button>
            </div>

            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {images.map((img: any, idx: number) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setSelectedImgIdx(idx)}
                    className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      selectedImgIdx === idx ? 'border-sky-400 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={getImageUrl(img.url)} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Your Stay Details */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <h2 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-400" /> Your Stay
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-xs mb-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Check-In</span>
                <span className="font-bold text-white text-sm">{checkInFormatted}</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">From 3:00 PM</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Check-Out</span>
                <span className="font-bold text-white text-sm">{checkOutFormatted}</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">By 11:00 AM</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Duration</span>
                <span className="font-bold text-white text-sm">{booking.nights} Nights</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Guests Breakdown</span>
                <span className="font-bold text-white text-sm">
                  {booking.adultsCount || booking.guestsCount} Adult{(booking.adultsCount || booking.guestsCount) > 1 ? 's' : ''}
                  {booking.childrenCount > 0 ? `, ${booking.childrenCount} Child${booking.childrenCount > 1 ? 'ren' : ''}` : ''}
                  {booking.infantsCount > 0 ? `, ${booking.infantsCount} Infant${booking.infantsCount > 1 ? 's' : ''}` : ''}
                  {booking.petsCount > 0 ? `, ${booking.petsCount} Pet${booking.petsCount > 1 ? 's' : ''}` : ''}
                </span>
              </div>
            </div>

            {booking.estimatedArrival && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs mb-3 flex items-center justify-between">
                <span className="font-bold text-slate-400">Estimated Arrival:</span>
                <span className="font-semibold text-white">{booking.estimatedArrival}</span>
              </div>
            )}

            {booking.specialRequests && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs mb-3">
                <span className="font-bold text-slate-300 block mb-1">Special Requests:</span>
                <p className="text-slate-400 leading-relaxed">{booking.specialRequests}</p>
              </div>
            )}

            {booking.emergencyName && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs space-y-1">
                <span className="font-bold text-amber-400 block">Emergency Contact (Private):</span>
                <p className="text-slate-300">{booking.emergencyName} ({booking.emergencyRelation || 'Contact'}) &bull; {booking.emergencyPhone}</p>
              </div>
            )}

            {(booking.status === 'PENDING' || booking.status === 'PENDING_PAYMENT') && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <span className="text-amber-400 font-semibold">This booking hold is awaiting payment.</span>
                <button
                  onClick={() => navigate(`/checkout/${booking.propertyId}?bookingId=${booking.id}`)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shrink-0"
                >
                  Complete Payment Now
                </button>
              </div>
            )}
          </div>

          {/* Property Specifications & Description */}
          {prop && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white mb-2">About Property</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{prop.description}</p>
              </div>

              {/* Property Attributes */}
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-sky-400" /> {prop.maxGuests} Max Guests</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-sky-400" /> {prop.bedrooms} Bedrooms</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-sky-400" /> {prop.bathrooms} Bathrooms</span>
              </div>

              {/* Amenities */}
              {(prop.propertyAmenities || prop.amenities) && (prop.propertyAmenities || prop.amenities).length > 0 && (
                <div className="pt-4 border-t border-slate-800/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Included Amenities</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {(prop.propertyAmenities || prop.amenities).map((pa: any) => (
                      <div key={pa.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{pa.amenity?.name || 'Amenity'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Pricing Breakdown, Payment Info, Host Info, Actions */}
        <div className="space-y-6">
          {/* Price Breakdown */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-base font-extrabold text-white border-b border-slate-800/80 pb-3">Price Breakdown</h3>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>${booking.nightlyPrice} × {booking.nights} nights</span>
                <span className="font-semibold">${booking.subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cleaning fee</span>
                <span className="font-semibold">${booking.cleaningFee?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>HoyHel service fee</span>
                <span className="font-semibold">${booking.serviceFee?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & fees</span>
                <span className="font-semibold">${booking.taxes?.toLocaleString()}</span>
              </div>
              {booking.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Promotional Discount</span>
                  <span className="font-semibold">-${booking.discount?.toLocaleString()}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-extrabold text-white">
                <span>Total Amount</span>
                <span className="text-lg text-sky-400">${booking.totalPrice?.toLocaleString()} USD</span>
              </div>
            </div>
          </div>

          {/* Payment Status Info */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400" /> Payment Information
            </h3>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payment Status</span>
                <span className="font-extrabold text-emerald-400 uppercase">
                  {booking.payment?.status || (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' ? 'SUCCESS' : 'PENDING')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payment Method</span>
                <span className="font-medium text-slate-200">{booking.payment?.paymentMethod || 'CREDIT_CARD'}</span>
              </div>
              {booking.payment?.transactionId && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Transaction Ref</span>
                  <span className="font-mono text-slate-300">{booking.payment.transactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Host Information Card */}
          {host && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Host Information</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border border-slate-700 shrink-0">
                  <img
                    src={host.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                    alt="Host Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{host.firstName} {host.lastName}</h4>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> Verified HoyHel Host
                  </span>
                </div>
              </div>

              <button
                onClick={handleContactHost}
                disabled={contacting}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-400 flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <MessageSquare className="w-4 h-4" /> Contact Host Sarah
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {prop && prop.status === 'PUBLISHED' && (
              <Link
                to={`/properties/${prop.id}`}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors text-center"
              >
                View Property Listing
              </Link>
            )}

            {isCompleted && !booking.review && (
              <button
                onClick={() => setReviewModalOpen(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <Star className="w-4 h-4" /> Write Property Review
              </button>
            )}

            {!isCancelled && !isCompleted && (
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" /> {cancelling ? 'Processing...' : 'Cancel Reservation'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] relative">
            <img src={getImageUrl(mainImage)} alt="Lightbox Full" className="max-w-full max-h-[80vh] rounded-2xl object-contain" />
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && (
        <ReviewModal
          booking={booking}
          onClose={() => setReviewModalOpen(false)}
          onSuccess={() => {
            setReviewModalOpen(false);
            fetchBookingDetails();
          }}
        />
      )}
    </div>
  );
};
