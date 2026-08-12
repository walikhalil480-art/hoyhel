import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, CheckCircle2, XCircle, Clock, Shield, Search, ArrowRight } from 'lucide-react';
import { apiClient } from '../api/client';

export const AdminHostsPage: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/host-applications', {
        params: { status: statusFilter || undefined },
      });
      setApplications(res.data.data || []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (appId: string, isApproved: boolean) => {
    let rejectionReason: string | undefined = undefined;
    if (!isApproved) {
      const reason = prompt('Enter rejection reason for this host application:');
      if (reason === null) return; // User cancelled prompt
      rejectionReason = reason;
    }

    try {
      setReviewingId(appId);
      await apiClient.patch(`/admin/host-applications/${appId}/review`, {
        isApproved,
        rejectionReason,
      });
      fetchApplications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review host application');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header & Sub-Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
            <UserCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Host Onboarding Approvals</h1>
            <p className="text-xs text-slate-400">Review host applications and grant HOST privileges to qualified applicants</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 glass-panel rounded-xl border border-slate-800 text-xs">
          <Link to="/admin" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium">Overview</Link>
          <Link to="/admin/bookings" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium">Reservations</Link>
          <span className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">Host Applications</span>
          <Link to="/admin/properties" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium">Properties</Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 mb-8 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300">Filter Applications by Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All Applications</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {/* Applications Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading host onboarding applications...</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No host applications found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-bold">Applicant</th>
                  <th className="py-3.5 px-4 font-bold">Brand / Business</th>
                  <th className="py-3.5 px-4 font-bold">Specs</th>
                  <th className="py-3.5 px-4 font-bold">Application Date</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-xs">{app.applicant?.firstName} {app.applicant?.lastName}</div>
                      <div className="text-[10px] text-slate-400">{app.applicant?.email}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-amber-400">
                      {app.businessName || 'Independent Host'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-200">{app.propertyType || 'Villa'}</div>
                      <div className="text-[10px] text-slate-400">{app.experienceYears || 1} years experience</div>
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        app.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        app.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {app.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReview(app.id, true)}
                            disabled={reviewingId === app.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                          >
                            Approve Host
                          </button>
                          <button
                            onClick={() => handleReview(app.id, false)}
                            disabled={reviewingId === app.id}
                            className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
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
