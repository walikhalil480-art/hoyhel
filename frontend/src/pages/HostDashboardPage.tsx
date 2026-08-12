import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusSquare, DollarSign, Building, Calendar, ArrowUpRight } from 'lucide-react';
import { apiClient } from '../api/client';

export const HostDashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHostEarnings();
  }, []);

  const fetchHostEarnings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/payouts/dashboard');
      setDashboardData(res.data.data);
    } catch {
      setDashboardData({
        totalGross: 0,
        netEarnings: 0,
        availableBalance: 0,
        pendingPayoutsSum: 0,
        completedPayoutsSum: 0,
        totalPlatformFees: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Host Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Manage listings, calendar availability, guest bookings, and financial payouts</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/host/properties"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            My Properties
          </Link>
          <Link
            to="/host/calendar"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" /> Calendar
          </Link>
          <Link
            to="/host/earnings"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs transition-colors"
          >
            Earnings Ledger
          </Link>
          <Link
            to="/host/add-property"
            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all"
          >
            <PlusSquare className="w-4 h-4" /> + List Your Property
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Net Earnings</span>
          <div className="text-2xl font-extrabold text-white mt-2">${dashboardData?.netEarnings || 0}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Balance</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">${dashboardData?.availableBalance || 0}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Payouts</span>
          <div className="text-2xl font-extrabold text-sky-400 mt-2">${dashboardData?.completedPayoutsSum || 0}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Fees Paid</span>
          <div className="text-2xl font-extrabold text-slate-300 mt-2">${dashboardData?.totalPlatformFees || 1250}</div>
        </div>
      </div>
    </div>
  );
};
