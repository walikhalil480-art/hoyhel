import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar, Users, ShieldCheck, Clock, CreditCard, ChevronRight, CheckCircle2,
  AlertCircle, MapPin, ArrowLeft, Info, HelpCircle, Lock, Award, MessageSquare, Phone, User, AlertTriangle
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { getImageUrl } from '../utils/imageUtils';

export const CheckoutPage: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Query param defaults
  const initialCheckIn = searchParams.get('checkIn') || new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const initialCheckOut = searchParams.get('checkOut') || new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
  const initialAdults = Number(searchParams.get('adults')) || 2;
  const initialChildren = Number(searchParams.get('children')) || 0;
  const initialInfants = Number(searchParams.get('infants')) || 0;
  const initialPets = Number(searchParams.get('pets')) || 0;
  const initialPromo = searchParams.get('promoCode') || '';
  const existingBookingId = searchParams.get('bookingId');

  // Multi-step State
  const [step, setStep] = useState<number>(existingBookingId ? 4 : 1);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [infants, setInfants] = useState(initialInfants);
  const [pets, setPets] = useState(initialPets);
  const [promoCode, setPromoCode] = useState(initialPromo);
  const [appliedPromo, setAppliedPromo] = useState(initialPromo);

  // Guest Information (Pre-filled from Profile)
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [guestCountry, setGuestCountry] = useState('Kenya');

  // Stay & Emergency Information
  const [estimatedArrival, setEstimatedArrival] = useState('15:00 - 17:00');
  const [specialRequests, setSpecialRequests] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  // Payment & Hold State
  const [priceData, setPriceData] = useState<any>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [initiatingHold, setInitiatingHold] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'MPESA'>('CREDIT_CARD');
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || '');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('•••');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Hold Timer (15 Minutes Countdown)
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 mins in seconds

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  useEffect(() => {
    if (propertyId && checkIn && checkOut) {
      fetchPriceBreakdown();
    }
  }, [propertyId, checkIn, checkOut, adults, children, appliedPromo]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (createdBooking && createdBooking.expiresAt && step === 4) {
      interval = setInterval(() => {
        const diff = Math.floor((new Date(createdBooking.expiresAt).getTime() - Date.now()) / 1000);
        if (diff <= 0) {
          setTimeLeft(0);
          setError('Your temporary booking hold has expired. Please re-select your dates.');
          setStep(1);
          clearInterval(interval);
        } else {
          setTimeLeft(diff);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [createdBooking, step]);

  const fetchProperty = async () => {
    try {
      setLoadingProperty(true);
      setError(null);
      const res = await apiClient.get(`/properties/${propertyId}`);
      const prop = res.data.data;

      if (!prop || prop.status !== 'PUBLISHED') {
        setError('This property is not currently available for reservation.');
      } else {
        setProperty(prop);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Property details could not be loaded.');
    } finally {
      setLoadingProperty(false);
    }
  };

  const fetchPriceBreakdown = async () => {
    try {
      setCalculatingPrice(true);
      setError(null);
      const totalGuests = adults + children;
      const res = await apiClient.post('/bookings/calculate-price', {
        propertyId,
        checkIn,
        checkOut,
        guestsCount: totalGuests,
        promoCode: appliedPromo || undefined,
      });
      setPriceData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid booking dates or guest count.');
      setPriceData(null);
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedPromo(promoCode.trim().toUpperCase());
  };

  const handleInitiateHold = async () => {
    try {
      setInitiatingHold(true);
      setError(null);

      const res = await apiClient.post('/bookings', {
        propertyId,
        checkIn,
        checkOut,
        adultsCount: adults,
        childrenCount: children,
        infantsCount: infants,
        petsCount: pets,
        specialRequests: specialRequests || undefined,
        estimatedArrival,
        emergencyName: emergencyName || undefined,
        emergencyPhone: emergencyPhone || undefined,
        emergencyRelation: emergencyRelation || undefined,
        promoCode: appliedPromo || undefined,
      });

      const booking = res.data.data;
      setCreatedBooking(booking);
      setStep(4); // Move to Payment Step
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create reservation hold. Please try again.');
    } finally {
      setInitiatingHold(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!createdBooking) return;

    try {
      setProcessingPayment(true);
      setPaymentError(null);

      const idempotencyKey = `ik_${createdBooking.id}_${Date.now()}`;
      const res = await apiClient.post('/payments/process', {
        bookingId: createdBooking.id,
        paymentMethod,
        phone: paymentMethod === 'MPESA' ? mpesaPhone : undefined,
        idempotencyKey,
      });

      if (res.data.data?.payment?.status === 'SUCCESS' || paymentMethod === 'CREDIT_CARD') {
        // Fetch confirmed booking details
        const bookingRes = await apiClient.get(`/bookings/${createdBooking.id}`);
        setConfirmedBooking(bookingRes.data.data);
        setStep(5); // Move to Confirmation Step
      } else {
        setPaymentError('Payment processing incomplete. Please check your phone for M-Pesa prompt.');
      }
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || 'Payment unsuccessful. Please try again or select another method.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loadingProperty) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-semibold text-slate-400">Loading Checkout Session...</p>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unavailable for Checkout</h2>
          <p className="text-xs text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/search')}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs"
          >
            &larr; Back to Property Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Checkout Progress Stepper Bar */}
      <div className="mb-10">
        <button
          onClick={() => (step > 1 && step < 5 ? setStep(step - 1) : navigate(`/properties/${propertyId}`))}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {step === 5 ? 'Back to Property' : 'Previous Step'}
        </button>

        <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border border-slate-800 overflow-x-auto">
          {[
            { num: 1, label: 'Dates & Guests' },
            { num: 2, label: 'Guest Details' },
            { num: 3, label: 'Review & Hold' },
            { num: 4, label: 'Payment' },
            { num: 5, label: 'Confirmation' },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div
                onClick={() => (s.num < step && step < 5 ? setStep(s.num) : null)}
                className={`flex items-center gap-2 cursor-pointer transition-all ${
                  step === s.num
                    ? 'text-sky-400 font-extrabold'
                    : step > s.num
                    ? 'text-emerald-400 font-bold'
                    : 'text-slate-500 font-medium'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-sky-500/20 text-sky-400 border-2 border-sky-400'
                      : step > s.num
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-600 border border-slate-800'
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span className="text-xs whitespace-nowrap hidden sm:inline">{s.label}</span>
              </div>
              {idx < 4 && <div className="w-8 h-0.5 bg-slate-800 hidden sm:block shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Global Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 5: BOOKING CONFIRMATION SCREEN */}
      {step === 5 && confirmedBooking ? (
        <div className="max-w-3xl mx-auto glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-6 shadow-2xl animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-extrabold text-xs uppercase tracking-widest">
              CONFIRMED RESERVATION #{confirmedBooking.bookingNumber}
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-3">You're All Set!</h1>
            <p className="text-xs text-slate-400 mt-1">
              Your reservation for <strong className="text-white">{property.title}</strong> is confirmed. A receipt and summary have been saved to your account.
            </p>
          </div>

          {/* Reservation Brief Card */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-4 text-xs text-slate-300">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
              <img
                src={getImageUrl(property.images?.[0]?.url)}
                alt={property.title}
                className="w-20 h-20 rounded-xl object-cover border border-slate-700 shrink-0"
              />
              <div>
                <h3 className="font-bold text-white text-sm">{property.title}</h3>
                <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" /> {property.address}, {property.city}, {property.country}
                </p>
                <div className="text-[11px] text-sky-400 font-semibold mt-1">Hosted by {property.host?.firstName} {property.host?.lastName}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Check-In</span>
                <span className="font-bold text-white">{new Date(confirmedBooking.checkIn).toLocaleDateString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Check-Out</span>
                <span className="font-bold text-white">{new Date(confirmedBooking.checkOut).toLocaleDateString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Nights & Guests</span>
                <span className="font-bold text-white">{confirmedBooking.nights} nights &bull; {confirmedBooking.guestsCount} guests</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Total Paid</span>
                <span className="font-extrabold text-emerald-400">${confirmedBooking.totalPrice} USD</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => navigate(`/reservations/${confirmedBooking.id}`)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs shadow-lg shadow-sky-500/20"
            >
              View Full Reservation Details
            </button>
            <button
              onClick={() => navigate('/my-reservations')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
            >
              Go to My Reservations
            </button>
          </div>
        </div>
      ) : (
        /* MAIN CHECKOUT CONTAINER */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* LEFT 2 COLUMNS: STEPS 1-4 */}
          <div className="lg:col-span-2 space-y-8">
            {/* STEP 1: DATES & GUEST SELECTION */}
            {step === 1 && (
              <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sky-400" /> Step 1: Select Stay Dates & Guests
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Choose your check-in/check-out dates and guest breakdown for {property.title}.</p>
                </div>

                {/* Date Selection Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Check-In Date</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Check-Out Date</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Guest Breakdown Selectors */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <span className="text-xs font-bold text-white block border-b border-slate-800 pb-2">Guest Categories (Max Limit: {property.maxGuests} Guests)</span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Adults (13+)</label>
                      <select
                        value={adults}
                        onChange={(e) => setAdults(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Children (2-12)</label>
                      <select
                        value={children}
                        onChange={(e) => setChildren(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        {Array.from({ length: property.maxGuests }, (_, i) => i).map((n) => (
                          <option key={n} value={n}>{n} Child{n !== 1 ? 'ren' : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Infants (&lt;2)</label>
                      <select
                        value={infants}
                        onChange={(e) => setInfants(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        {[0, 1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>{n} Infant{n !== 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Pets</label>
                      <select
                        value={pets}
                        onChange={(e) => setPets(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        {[0, 1, 2].map((n) => (
                          <option key={n} value={n}>{n} Pet{n !== 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Promo Code Entry */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Apply Promo Code</label>
                  <form onSubmit={handleApplyPromo} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="e.g. LUXE10"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white uppercase focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-xl transition-colors"
                    >
                      Apply Code
                    </button>
                  </form>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!priceData || calculatingPrice}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Continue to Guest Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: GUEST PROFILE & CONTACT INFO */}
            {step === 2 && (
              <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-sky-400" /> Step 2: Guest Information
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Pre-filled using your verified HoyHel account profile.</p>
                </div>

                {/* Profile Card Summary */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <img
                    src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                    alt="Guest Avatar"
                    className="w-14 h-14 rounded-full object-cover border-2 border-sky-400"
                  />
                  <div>
                    <h3 className="font-bold text-white text-sm">{user?.firstName} {user?.lastName}</h3>
                    <p className="text-xs text-slate-400">{user?.email}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      Verified Guest Profile
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+254 700 000 000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Country of Residence</label>
                    <input
                      type="text"
                      value={guestCountry}
                      onChange={(e) => setGuestCountry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Additional Stay Details */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Stay Details & Preferences</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5">Estimated Check-In Time</label>
                      <select
                        value={estimatedArrival}
                        onChange={(e) => setEstimatedArrival(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
                      >
                        <option value="15:00 - 17:00">3:00 PM - 5:00 PM (Standard)</option>
                        <option value="17:00 - 19:00">5:00 PM - 7:00 PM</option>
                        <option value="19:00 - 21:00">7:00 PM - 9:00 PM</option>
                        <option value="21:00+">Late Check-in (After 9:00 PM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5">Special Requests (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Quiet floor, early check-in request..."
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Emergency Contact */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Phone className="w-4 h-4" /> Optional Emergency Contact
                  </div>
                  <p className="text-[11px] text-slate-400">Kept private and used strictly by platform administration in emergency situations.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <input
                      type="text"
                      placeholder="Contact Name"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Relationship (e.g. Spouse)"
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                      className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2"
                  >
                    Review Reservation <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & INITIATE HOLD */}
            {step === 3 && (
              <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-sky-400" /> Step 3: Review Reservation Details
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Review your stay parameters and cancellation terms before locking your 15-minute temporary hold.</p>
                </div>

                {/* Stay Summary Box */}
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs text-slate-300">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-white text-sm">{property.title}</h3>
                      <p className="text-slate-400">{property.address}, {property.city}, {property.country}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px] uppercase">
                      {property.cancellationPolicy} Policy
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Check-In</span>
                      <span className="font-bold text-white">{new Date(checkIn).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Check-Out</span>
                      <span className="font-bold text-white">{new Date(checkOut).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Guests Breakdown</span>
                      <span className="font-bold text-white">{adults} Adults, {children} Children</span>
                    </div>
                  </div>

                  {specialRequests && (
                    <div className="pt-2">
                      <span className="font-bold text-slate-400">Special Requests:</span> {specialRequests}
                    </div>
                  )}
                </div>

                {/* Cancellation Policy Description */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-sky-400" /> Cancellation Policy ({property.cancellationPolicy})
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    {property.cancellationPolicy === 'FLEXIBLE' && 'Full refund up to 24 hours prior to check-in. 50% refund thereafter.'}
                    {property.cancellationPolicy === 'MODERATE' && 'Full refund up to 5 days prior to check-in. 50% refund up to 48 hours prior.'}
                    {property.cancellationPolicy === 'STRICT' && 'Full refund up to 14 days prior to check-in. 50% refund up to 7 days prior.'}
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleInitiateHold}
                    disabled={initiatingHold}
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {initiatingHold ? 'Securing Hold Lock...' : 'Lock 15-Min Hold & Proceed to Payment'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: PAYMENT STEP WITH ACTIVE HOLD COUNTDOWN */}
            {step === 4 && (
              <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Clock className="w-5 h-5 shrink-0 animate-pulse" />
                    <span>Temporary Booking Hold Active</span>
                  </div>
                  <div className="font-mono font-extrabold text-white text-base bg-slate-950 px-3 py-1 rounded-xl border border-amber-500/40">
                    Expires in {formatTimer(timeLeft)}
                  </div>
                </div>

                {paymentError && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-400">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-sky-400" /> Step 4: Select Payment Method
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Complete your payment before the hold expires to confirm reservation.</p>
                </div>

                {/* Payment Method Tabs */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 ${
                      paymentMethod === 'CREDIT_CARD'
                        ? 'bg-sky-500/10 border-sky-400 text-white shadow-lg shadow-sky-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CreditCard className="w-6 h-6 text-sky-400" />
                    <div>
                      <span className="font-bold text-xs block">Credit / Debit Card</span>
                      <span className="text-[10px] text-slate-400">Visa, MasterCard, Amex</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('MPESA')}
                    className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 ${
                      paymentMethod === 'MPESA'
                        ? 'bg-emerald-500/10 border-emerald-400 text-white shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Phone className="w-6 h-6 text-emerald-400" />
                    <div>
                      <span className="font-bold text-xs block">M-Pesa STK Push</span>
                      <span className="text-[10px] text-slate-400">Instant Mobile Checkout</span>
                    </div>
                  </button>
                </div>

                {/* Payment Inputs */}
                {paymentMethod === 'CREDIT_CARD' ? (
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Expiration Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">CVC Code</label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
                    <label className="block text-slate-300 font-bold">M-Pesa Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 254712345678"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white font-mono"
                    />
                    <p className="text-[11px] text-slate-400">An STK prompt will be sent directly to your phone to authorize payment.</p>
                  </div>
                )}

                <button
                  onClick={handleProcessPayment}
                  disabled={processingPayment || timeLeft <= 0}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {processingPayment ? 'Verifying Gateway Response...' : `Pay $${priceData?.totalPrice || ''} USD & Confirm Booking`}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT 1 COLUMN: SERVER-AUTHORITATIVE PRICE BREAKDOWN */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 sticky top-24 space-y-6">
              {/* Property Header */}
              <div className="flex gap-4 pb-6 border-b border-slate-800/80">
                <img
                  src={getImageUrl(property.images?.[0]?.url)}
                  alt={property.title}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-700 shrink-0"
                />
                <div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">{property.propertyType}</span>
                  <h3 className="font-bold text-white text-sm line-clamp-1">{property.title}</h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-sky-400 shrink-0" /> {property.city}, {property.country}
                  </p>
                </div>
              </div>

              {/* Price Itemized List */}
              {priceData ? (
                <div className="space-y-3 text-xs text-slate-300">
                  <h4 className="font-extrabold text-white border-b border-slate-800 pb-2">Price Breakdown</h4>

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
                      <span>Applied discounts</span>
                      <span>-${priceData.discount}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-extrabold text-white">
                    <span>Total Amount</span>
                    <span className="text-lg text-sky-400">${priceData.totalPrice} USD</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">Calculating server pricing...</div>
              )}

              {/* Guarantee Footer */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Protected by HoyHel 100% Guest Protection & Double-Booking Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
