import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, Users, Calendar, Building, Search, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';
import { UserModerationModal } from '../components/admin/UserModerationModal';

export const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Moderation modal target user ID
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [statusFilter, search]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/reports', {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
        },
      });
      setReports(res.data.data || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReportStatus = async (status: 'RESOLVED' | 'DISMISSED') => {
    if (!selectedReport) return;
    try {
      setSubmitting(true);
      await apiClient.patch(`/admin/reports/${selectedReport.id}`, {
        status,
        adminNotes: adminNotes.trim() || undefined,
      });
      setSelectedReport(null);
      setAdminNotes('');
      fetchReports();
    } catch {
      // Ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header & Subnav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">User Violation Reports</h1>
            <p className="text-xs text-slate-400">Review misconduct tickets submitted by platform guests and hosts</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 glass-panel rounded-xl border border-slate-800 text-xs">
          <Link to="/admin" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium">
            Overview
          </Link>
          <Link to="/admin/users" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-400" /> Users
          </Link>
          <span className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> User Reports
          </span>
          <Link to="/admin/bookings" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-sky-400" /> Reservations
          </Link>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report reason, description, reporter or target user..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          {[
            { id: '', label: 'All Statuses' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'RESOLVED', label: 'Resolved' },
            { id: 'DISMISSED', label: 'Dismissed' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3.5 py-2 rounded-xl transition-all ${statusFilter === st.id ? 'bg-amber-500 text-slate-950 font-bold shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'}`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-panel p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
            Loading violation reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-400 text-sm rounded-2xl border border-slate-800">
            No report tickets found matching the filter criteria.
          </div>
        ) : (
          reports.map((rep) => (
            <div key={rep.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-xs">
                      {rep.reason}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded font-bold text-xs ${rep.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300' : rep.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      {rep.status}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-2">{rep.details || 'No detailed message provided.'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setInspectUserId(rep.reportedUser?.id)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" /> Moderate User
                  </button>
                  {rep.status === 'PENDING' && (
                    <button
                      onClick={() => setSelectedReport(rep)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      Resolve Ticket
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                <div>
                  Filed by: <span className="text-slate-200 font-semibold">{rep.reporter?.firstName} {rep.reporter?.lastName} ({rep.reporter?.email})</span>
                </div>
                <div>
                  Target User: <span className="text-slate-200 font-semibold">{rep.reportedUser?.firstName} {rep.reportedUser?.lastName} ({rep.reportedUser?.email})</span>
                </div>
                <div className="font-mono text-slate-500">
                  {new Date(rep.createdAt).toLocaleString()}
                </div>
              </div>

              {rep.adminNotes && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                  <span className="font-bold text-amber-400">Admin Resolution Note:</span> {rep.adminNotes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Resolution Dialog Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 bg-[#0b0e17] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Resolve Misconduct Ticket
            </h3>

            <p className="text-xs text-slate-300">
              Report against <span className="font-bold text-white">{selectedReport.reportedUser?.email}</span> for &quot;{selectedReport.reason}&quot;.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Administrative Action Notes</label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter notes on investigation or action taken..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={submitting}
                onClick={() => handleUpdateReportStatus('RESOLVED')}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Mark Resolved
              </button>
              <button
                disabled={submitting}
                onClick={() => handleUpdateReportStatus('DISMISSED')}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Dismiss Ticket
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Inspection Modal */}
      {inspectUserId && (
        <UserModerationModal
          userId={inspectUserId}
          onClose={() => setInspectUserId(null)}
          onUpdated={fetchReports}
        />
      )}
    </div>
  );
};
