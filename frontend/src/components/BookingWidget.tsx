import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface BookingWidgetProps {
  propertyId: string;
  basePrice: number;
  maxGuests: number;
  cleaningFee: number;
}

export const BookingWidget: React.FC<BookingWidgetProps> = ({
  propertyId,
  basePrice,
  maxGuests,
  cleaningFee,
}) => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fiveDaysLater = new Date();
  fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

  const [checkIn, setCheckIn] = useState(tomorrow.toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(fiveDaysLater.toISOString().split('T')[0]);
  const [guests, setGuests] = useState(2);
  const [loading, setLoading] = useState(false);
  const [priceData, setPriceData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');

  useEffect(() => {
    fetchPriceBreakdown();
  }, [checkIn, checkOut, guests, appliedPromo]);

  const fetchPriceBreakdown = async () => {
    try {
      setError(null);
      const res = await apiClient.post('/bookings/calculate-price', {
        propertyId,
        checkIn,
        checkOut,
        guestsCount: guests,
        promoCode: appliedPromo || undefined,
      });
      setPriceData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid date range');
    }
  };

  const applyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedPromo(promoCode.trim());
  };

  const handleBookingSubmit = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates.');
      return;
    }

    navigate(
      `/checkout/${propertyId}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${guests}&promoCode=${encodeURIComponent(appliedPromo || '')}`
    );
  };

  return (
    <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl sticky top-24">
      <div className="flex items-baseline justify-between mb-6 pb-6 border-b border-slate-800/80">
        <div>
          <span className="text-3xl font-extrabold text-white">${basePrice}</span>
          <span className="text-sm text-slate-400"> / night</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
          <Zap className="w-3.5 h-3.5" /> Instant Booking
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Date Pickers */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Check-In</label>
            <div className="relative">
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Check-Out</label>
            <div className="relative">
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Guests</label>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? 'Guest' : 'Guests'}
              </option>
            ))}
          </select>
        </div>

        {/* Promo Code Form */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Promo Code</label>
          <form onSubmit={applyPromo} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. LUXE10"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-400 rounded-xl transition-colors"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {/* Itemized Price Calculation */}
      {priceData && (
        <div className="space-y-3 py-4 mb-6 border-t border-b border-slate-800/80 text-xs text-slate-300">
          <div className="flex justify-between">
            <span>${priceData.avgNightlyPrice} &times; {priceData.nights} nights</span>
            <span className="font-semibold text-white">${priceData.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Cleaning fee</span>
            <span className="font-semibold text-white">${priceData.cleaningFee}</span>
          </div>
          <div className="flex justify-between">
            <span>LuxeHaven service fee (10%)</span>
            <span className="font-semibold text-white">${priceData.serviceFee}</span>
          </div>
          <div className="flex justify-between">
            <span>Occupancy taxes (8%)</span>
            <span className="font-semibold text-white">${priceData.taxes}</span>
          </div>
          {priceData.discount > 0 && (
            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>Discounts applied</span>
              <span>-${priceData.discount}</span>
            </div>
          )}

          <div className="flex justify-between pt-3 border-t border-slate-800 text-sm font-extrabold text-white">
            <span>Total due</span>
            <span className="text-sky-400">${priceData.totalPrice}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleBookingSubmit}
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-extrabold text-sm text-white shadow-xl shadow-sky-500/20 transition-all disabled:opacity-50 mb-4"
      >
        {loading ? 'Processing Transaction...' : 'Reserve Luxury Stay'}
      </button>

      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Protected by LuxeHaven 100% Guarantee</span>
      </div>
    </div>
  );
};
