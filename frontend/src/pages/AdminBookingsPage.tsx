import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, Shield, DollarSign, CheckCircle2, XCircle, Clock, Eye, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/client';

export const AdminBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ total: 0, page: 1, totalPages: 1 });
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchAdminBookings();
    fetchAnalytics();
  }, [search, statusFilter, paymentFilter, page]);

  const fetchAdminBookings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/bookings', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          paymentStatus: paymentFilter || undefined,
          page,
          limit: 15,
        },
      });
      setBookings(res.data.data || []);
      setMeta(res.data.meta || { total: 0, page: 1, totalPages: 1 });
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await apiClient.get('/admin/analytics');
      setAnalytics(res.data.data);
    } catch {
      setAnalytics(null);
    }
  };

  const handleAdminCancel = async () => {
    if (!selectedBooking) return;
    try {
      setCancelling(true);
      await apiClient.post(`/admin/bookings/${selectedBooking.id}/cancel`, {
        reason: cancelReason || 'Cancelled by Administrator',
      });
      setSelectedBooking(null);
      setCancelReason('');
      fetchAdminBookings();
      fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
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
            <h1 className="text-3xl font-extrabold text-white">Reservation Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">Audit, monitor and manage all platform bookings and ledger transactions</p>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex items-center gap-2 p-1.5 glass-panel rounded-xl border border-slate-800 self-start md:self-auto text-xs">
          <Link to="/admin" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium">Overview</Link>
          <span className="px-3.5 py-1.5 rounded-lg bg-sky-500 text-white font-bold">Reservations</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Reservations</span>
          <span className="text-2xl font-extrabold text-white">{analytics?.totalBookings || 0}</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Gross Booking Revenue</span>
          <span className="text-2xl font-extrabold text-emerald-400">${analytics?.totalRevenue?.toLocaleString() || 0}</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Platform Fees (10%)</span>
          <span className="text-2xl font-extrabold text-sky-400">${analytics?.platformFees?.toLocaleString() || 0}</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Net Platform Revenue</span>
          <span className="text-2xl font-extrabold text-amber-400">${analytics?.netPlatformRevenue?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 mb-8 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-sky-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search by Booking ID, Guest name/email, Property, or Host..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Booking Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="PENDING_PAYMENT">PENDING PAYMENT HOLD</option>
            <option value="PENDING">PENDING</option>
            <option value="EXPIRED">EXPIRED HOLD</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Payment Statuses</option>
            <option value="SUCCESS">SUCCESS (Paid)</option>
            <option value="PENDING">PENDING</option>
            <option value="REFUNDED">REFUNDED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl mb-6">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading platform reservations...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No reservations match your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-bold">Booking ID</th>
                  <th className="py-3.5 px-4 font-bold">Guest</th>
                  <th className="py-3.5 px-4 font-bold">Property & Host</th>
                  <th className="py-3.5 px-4 font-bold">Dates & Stay</th>
                  <th className="py-3.5 px-4 font-bold">Total Price</th>
                  <th className="py-3.5 px-4 font-bold">Payment</th>
                  <th className="py-3.5 px-4 font-bold">Booking Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {bookings.map((booking) => (
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
                          <div className="text-[10px] text-slate-400">{booking.guest?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-white line-clamp-1 max-w-[200px]">{booking.property?.title}</div>
                      <div className="text-[10px] text-slate-400">{booking.property?.city}, {booking.property?.country} &bull; Host: {booking.property?.host?.firstName} {booking.property?.host?.lastName}</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-200">{new Date(booking.checkIn).toLocaleDateString()} &rarr; {new Date(booking.checkOut).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">{booking.nights} nights &bull; {booking.guestsCount} guests</div>
                    </td>
                    <td className="py-4 px-4 font-extrabold text-white text-sm">
                      ${booking.totalPrice?.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        booking.payment?.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        booking.payment?.status === 'REFUNDED' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {booking.payment?.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                        booking.status === 'CONFIRMED' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                        booking.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        booking.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors"
                        title="View Full Booking Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Showing page {meta.page} of {meta.totalPages} ({meta.total} total reservations)</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 text-white font-bold"
            >
              Previous
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 text-white font-bold"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Booking Details & Action Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest block">ADMIN RESERVATION AUDIT</span>
                <h3 className="text-xl font-extrabold text-white">{selectedBooking.bookingNumber}</h3>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-white text-lg font-bold">&times;</button>
            </div>

            <div className="space-y-6 text-xs text-slate-300">
              {/* Guest & Host Information */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Guest Details</span>
                  <div className="font-bold text-white">{selectedBooking.guest?.firstName} {selectedBooking.guest?.lastName}</div>
                  <div>{selectedBooking.guest?.email}</div>
                  <div>{selectedBooking.guest?.phone || 'No phone recorded'}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Host & Property</span>
                  <div className="font-bold text-white">{selectedBooking.property?.title}</div>
                  <div>{selectedBooking.property?.city}, {selectedBooking.property?.country}</div>
                  <div className="text-sky-400">Host: {selectedBooking.property?.host?.firstName} {selectedBooking.property?.host?.lastName}</div>
                </div>
              </div>

              {/* Reservation & Dates */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Check-In</span>
                  <span className="font-extrabold text-white">{new Date(selectedBooking.checkIn).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Check-Out</span>
                  <span className="font-extrabold text-white">{new Date(selectedBooking.checkOut).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Stay Spec</span>
                  <span className="font-extrabold text-sky-400">{selectedBooking.nights} nights &bull; {selectedBooking.guestsCount} guests</span>
                </div>
              </div>

              {/* Itemized Financial Breakdown */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Itemized Ledger Breakdown</span>
                <div className="flex justify-between"><span>Nightly Rate &times; {selectedBooking.nights} nights</span><span>${selectedBooking.subtotal}</span></div>
                <div className="flex justify-between"><span>Cleaning Fee</span><span>${selectedBooking.cleaningFee}</span></div>
                <div className="flex justify-between text-sky-400"><span>LuxeHaven Platform Service Fee (10%)</span><span>${selectedBooking.serviceFee}</span></div>
                <div className="flex justify-between"><span>Occupancy Taxes (8%)</span><span>${selectedBooking.taxes}</span></div>
                <div className="flex justify-between font-extrabold text-white text-sm pt-2 border-t border-slate-800">
                  <span>Total Booking Price</span>
                  <span className="text-emerald-400">${selectedBooking.totalPrice}</span>
                </div>
              </div>

              {/* Administrative Action Section */}
              {selectedBooking.status !== 'CANCELLED' && selectedBooking.status !== 'REFUNDED' && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Admin Actions: Cancel & Process Refund
                  </span>
                  <input
                    type="text"
                    placeholder="Enter administrative cancellation reason..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-slate-900 border border-rose-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <button
                    onClick={handleAdminCancel}
                    disabled={cancelling}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white transition-colors disabled:opacity-50"
                  >
                    {cancelling ? 'Processing Refund...' : 'Cancel Booking & Full Refund'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
