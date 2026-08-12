import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ArrowUpRight, Clock, ShieldCheck, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { apiClient } from '../api/client';

export const HostEarningsPage: React.FC = () => {
  const [payoutsData, setPayoutsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/payouts/dashboard');
      setPayoutsData(res.data.data);
    } catch {
      setPayoutsData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Host Financial Earnings</h1>
            <p className="text-xs text-slate-400">Track gross booking volume, platform service fee deductions, and net electronic payouts</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/host/dashboard"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/host/properties"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            My Properties
          </Link>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Gross Booking Volume</span>
          <span className="text-2xl font-extrabold text-white">${payoutsData?.grossBookingVolume?.toLocaleString() || 0}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Platform Service Fees (10%)</span>
          <span className="text-2xl font-extrabold text-sky-400">${payoutsData?.totalPlatformFees?.toLocaleString() || 0}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Host Net Paid Earnings</span>
          <span className="text-2xl font-extrabold text-emerald-400">${payoutsData?.netEarningsPaid?.toLocaleString() || 0}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Pending Payout Balance</span>
          <span className="text-2xl font-extrabold text-amber-400">${payoutsData?.pendingPayouts?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Payout Transactions Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-white text-base">Host Electronic Payout Ledger</h3>
          <span className="text-xs text-slate-400">Automatic payouts processed within 24 hours of guest check-in</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading electronic payouts ledger...</div>
        ) : !payoutsData?.payouts || payoutsData.payouts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No payout records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-bold">Payout Reference</th>
                  <th className="py-3.5 px-4 font-bold">Property</th>
                  <th className="py-3.5 px-4 font-bold">Gross Amount</th>
                  <th className="py-3.5 px-4 font-bold">Fee (10%)</th>
                  <th className="py-3.5 px-4 font-bold">Net Payout</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Processed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payoutsData.payouts.map((payout: any) => (
                  <tr key={payout.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4 font-mono text-sky-400 font-bold">{payout.payoutNumber || payout.id.slice(0, 8)}</td>
                    <td className="py-4 px-4 font-bold text-white">{payout.booking?.property?.title || 'Luxury Stay'}</td>
                    <td className="py-4 px-4 font-medium">${payout.grossAmount?.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sky-400">-${payout.platformFee?.toLocaleString()}</td>
                    <td className="py-4 px-4 font-extrabold text-emerald-400 text-sm">${payout.netAmount?.toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        payout.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {payout.processedAt ? new Date(payout.processedAt).toLocaleDateString() : 'Processing'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
