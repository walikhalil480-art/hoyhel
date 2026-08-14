import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Building, DollarSign, Activity, Calendar, ArrowRight } from 'lucide-react';
import { apiClient } from '../api/client';

export const AdminDashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, logsRes] = await Promise.all([
        apiClient.get('/admin/analytics'),
        apiClient.get('/admin/audit-logs'),
      ]);
      setAnalytics(analyticsRes.data.data);
      setAuditLogs(logsRes.data.data || []);
    } catch {
      setAnalytics(null);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header & Sub-Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center border border-indigo-500/40">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">System Admin Console</h1>
            <p className="text-xs text-slate-400">Platform analytics, reservation audit, property verification & security logs</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 glass-panel rounded-xl border border-slate-800 text-xs">
          <span className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold">Overview</span>
          <Link to="/admin/users" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-400" /> Users
          </Link>
          <Link to="/admin/reports" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1">
            User Reports
          </Link>
          <Link to="/admin/bookings" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-sky-400" /> Reservations
          </Link>
          <Link to="/admin/hosts" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1">
            Host Applications
          </Link>
          <Link to="/admin/properties" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-indigo-400" /> Properties
          </Link>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Gross Booking Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-extrabold text-white">${analytics?.totalRevenue?.toLocaleString() || 0}</span>
          <div className="text-[10px] text-slate-400 mt-1">Host Payouts: ${analytics?.hostEarnings?.toLocaleString() || 0}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Platform Fees (10%)</span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-2xl font-extrabold text-sky-400">${analytics?.platformFees?.toLocaleString() || 0}</span>
          <div className="text-[10px] text-slate-400 mt-1">Net Platform: ${analytics?.netPlatformRevenue?.toLocaleString() || 0}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Total Reservations</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-2xl font-extrabold text-white">{analytics?.totalBookings || 0}</span>
          <div className="text-[10px] text-slate-400 mt-1">{analytics?.confirmedBookings || 0} Confirmed &bull; {analytics?.completedBookings || 0} Completed</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase mb-2">
            <span>Total Platform Users</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-extrabold text-amber-400">{analytics?.totalUsers || 0}</span>
          <div className="text-[10px] text-slate-400 mt-1">{analytics?.totalHosts || 0} Hosts &bull; {analytics?.totalProperties || 0} Properties</div>
        </div>
      </div>

      {/* Reservation Management Quick Callout */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 mb-10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Reservation Ledger & Audit Suite</h2>
          <p className="text-xs text-slate-400">Search, audit status lifecycles, inspect itemized pricing breakdowns and process refunds.</p>
        </div>
        <Link
          to="/admin/bookings"
          className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-sky-500/20 shrink-0"
        >
          Manage All Reservations <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" /> Real-time System Security Audit Logs
        </h2>

        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-extrabold text-[10px]">
                  {log.action}
                </span>
                <span className="text-slate-300">{log.user?.email || 'System'}</span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
