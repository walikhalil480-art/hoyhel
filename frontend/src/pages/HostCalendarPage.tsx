import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Lock, ShieldCheck, Building2, CheckCircle2, Clock } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export const HostCalendarPage: React.FC = () => {
  const { user } = useAuthStore();
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHostProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchAvailability();
    }
  }, [selectedPropertyId, currentDate]);

  const fetchHostProperties = async () => {
    try {
      if (!user) return;
      const res = await apiClient.get('/properties', {
        params: { hostId: user.id, limit: 50 },
      });
      const props = res.data.data || [];
      setProperties(props);
      if (props.length > 0) {
        setSelectedPropertyId(props[0].id);
      }
    } catch {
      setProperties([]);
    }
  };

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();

      const [availRes, bookingsRes] = await Promise.all([
        apiClient.get(`/availability/property/${selectedPropertyId}`, {
          params: { startDate, endDate },
        }),
        apiClient.get('/bookings/user', { params: { role: 'host' } }),
      ]);

      setAvailability(availRes.data.data || []);
      setBookings(
        (bookingsRes.data.data || []).filter(
          (b: any) => b.propertyId === selectedPropertyId && b.status !== 'CANCELLED'
        )
      );
    } catch {
      setAvailability([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDateBlock = async (dateStr: string, isCurrentlyBlocked: boolean, isBooked: boolean) => {
    if (isBooked) return;

    try {
      if (isCurrentlyBlocked) {
        await apiClient.post('/availability/unblock', {
          propertyId: selectedPropertyId,
          date: dateStr,
        });
      } else {
        await apiClient.post('/availability/block', {
          propertyId: selectedPropertyId,
          date: dateStr,
        });
      }
      fetchAvailability();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update date availability');
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Calendar matrix calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
            <CalendarIcon className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Host Calendar Availability</h1>
            <p className="text-xs text-slate-400">Block or unblock dates to manage guest booking windows</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/host/dashboard" className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
            Dashboard
          </Link>
          <Link to="/host/properties" className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
            My Properties
          </Link>
        </div>
      </div>

      {/* Property Selector Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Select Property:</span>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full md:w-80 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.title} ({p.city})</option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500"></span> Available
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500/30 border border-sky-400"></span> Booked Guest Stay
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500"></span> Host Blocked
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
          <button onClick={prevMonth} className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:text-white text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-extrabold text-white">
            {monthNames[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:text-white text-slate-400">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2.5">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24 rounded-2xl bg-slate-950/20 border border-slate-900/50 opacity-20"></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateObj = new Date(year, month, dayNum);
            const dateStr = dateObj.toISOString().split('T')[0];

            // Check if booked or held
            const bookingRecord = bookings.find((b) => {
              const checkIn = new Date(b.checkIn).toISOString().split('T')[0];
              const checkOut = new Date(b.checkOut).toISOString().split('T')[0];
              return dateStr >= checkIn && dateStr < checkOut;
            });

            const isConfirmed = bookingRecord && (bookingRecord.status === 'CONFIRMED' || bookingRecord.status === 'CHECKED_IN');
            const isPendingHold = bookingRecord && (bookingRecord.status === 'PENDING' || bookingRecord.status === 'PENDING_PAYMENT');

            // Check if blocked
            const availRecord = availability.find((a) => {
              const aDate = new Date(a.date).toISOString().split('T')[0];
              return aDate === dateStr;
            });
            const isBlocked = availRecord?.isBlocked;

            return (
              <div
                key={dayNum}
                onClick={() => toggleDateBlock(dateStr, !!isBlocked, !!isConfirmed || !!isPendingHold)}
                className={`h-24 p-2.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                  isConfirmed ? 'bg-sky-500/10 border-sky-500/40 text-sky-300' :
                  isPendingHold ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' :
                  isBlocked ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20' :
                  'bg-slate-900/60 border-slate-800 hover:border-emerald-500/50 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>{dayNum}</span>
                  {isConfirmed ? <Lock className="w-3.5 h-3.5 text-sky-400" /> : isPendingHold ? <Clock className="w-3.5 h-3.5 text-amber-400" /> : isBlocked ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : null}
                </div>

                <div className="text-[10px] font-extrabold uppercase tracking-tight">
                  {isConfirmed ? 'Guest Stay' : isPendingHold ? 'Pending Hold' : isBlocked ? 'Blocked' : 'Available'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
