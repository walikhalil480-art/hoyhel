import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, XCircle, Clock, Eye, Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { getImageUrl } from '../utils/imageUtils';

export const AdminPropertiesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'REMOVAL' | 'ALL' | 'ARCHIVED'>('PENDING');
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [rejectModalProperty, setRejectModalProperty] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectType, setRejectType] = useState<'LISTING_REJECT' | 'REMOVAL_REJECT'>('LISTING_REJECT');

  const [archiveModalProperty, setArchiveModalProperty] = useState<any>(null);
  const [archiveReason, setArchiveReason] = useState('');

  const [historyModalProperty, setHistoryModalProperty] = useState<any>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, [activeTab]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setActionError(null);
      if (activeTab === 'REMOVAL') {
        const res = await apiClient.get('/admin/removal-requests');
        setProperties(res.data.data || []);
      } else {
        const statusParam = activeTab === 'PENDING' ? 'PENDING_APPROVAL' : activeTab === 'ARCHIVED' ? 'ARCHIVED' : undefined;
        const res = await apiClient.get('/admin/properties', {
          params: { status: statusParam, limit: 50 },
        });
        setProperties(res.data.data || []);
      }
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (propertyId: string) => {
    try {
      setActionError(null);
      await apiClient.post(`/admin/properties/${propertyId}/approve`);
      fetchProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to approve property');
    }
  };

  const handleOpenRejectModal = (property: any, type: 'LISTING_REJECT' | 'REMOVAL_REJECT') => {
    setRejectModalProperty(property);
    setRejectType(type);
    setRejectReason('');
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalProperty || !rejectReason.trim()) return;

    try {
      setActionError(null);
      if (rejectType === 'LISTING_REJECT') {
        await apiClient.post(`/admin/properties/${rejectModalProperty.id}/reject`, { reason: rejectReason });
      } else {
        await apiClient.post(`/admin/removal-requests/${rejectModalProperty.id}/reject`, { reason: rejectReason });
      }
      setRejectModalProperty(null);
      setRejectReason('');
      fetchProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to reject');
    }
  };

  const handleApproveRemoval = async (propertyId: string) => {
    try {
      setActionError(null);
      await apiClient.post(`/admin/removal-requests/${propertyId}/approve`);
      fetchProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to approve removal request');
    }
  };

  const handleArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveModalProperty) return;

    try {
      setActionError(null);
      await apiClient.post(`/admin/properties/${archiveModalProperty.id}/archive`, { reason: archiveReason });
      setArchiveModalProperty(null);
      setArchiveReason('');
      fetchProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to archive property');
    }
  };

  const handleRestore = async (propertyId: string) => {
    try {
      setActionError(null);
      await apiClient.post(`/admin/properties/${propertyId}/restore`);
      fetchProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to restore property');
    }
  };

  const handleHardDelete = async (propertyId: string) => {
    if (!window.confirm('Are you sure you want to attempt hard deletion of this property? If bookings or financial records exist, hard deletion will be blocked.')) return;

    try {
      setActionError(null);
      const res = await apiClient.delete(`/admin/properties/${propertyId}/hard-delete`);
      alert(res.data.message || 'Property deleted');
      fetchProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to delete property');
    }
  };

  const handleOpenStatusHistory = async (property: any) => {
    try {
      setHistoryModalProperty(property);
      setHistoryLoading(true);
      const res = await apiClient.get(`/properties/${property.id}/status-history`);
      setStatusHistory(res.data.data || []);
    } catch {
      setStatusHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header & Sub-Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center border border-indigo-500/40">
            <Building2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Property Moderation & Removal Console</h1>
            <p className="text-xs text-slate-400">Review pending listings, process removal requests, archive listings & inspect audit timelines</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 glass-panel rounded-xl border border-slate-800 text-xs">
          <Link to="/admin" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium">Overview</Link>
          <Link to="/admin/bookings" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium">Reservations</Link>
          <Link to="/admin/hosts" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium">Host Applications</Link>
          <span className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold">Properties</span>
        </div>
      </div>

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
          {actionError}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'PENDING' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          Pending Approvals
        </button>
        <button
          onClick={() => setActiveTab('REMOVAL')}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'REMOVAL' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          Removal Requests Queue
        </button>
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'ALL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          All Listings
        </button>
        <button
          onClick={() => setActiveTab('ARCHIVED')}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'ARCHIVED' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Archived Properties
        </button>
      </div>

      {/* Properties Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading platform properties...</div>
        ) : properties.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No property records found in this queue.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-bold">Property Listing</th>
                  <th className="py-3.5 px-4 font-bold">Host</th>
                  <th className="py-3.5 px-4 font-bold">Location</th>
                  <th className="py-3.5 px-4 font-bold">Price / Night</th>
                  {activeTab === 'REMOVAL' && <th className="py-3.5 px-4 font-bold">Removal Details</th>}
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {properties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getImageUrl(prop.images?.[0]?.url)}
                          alt={prop.title}
                          className="w-12 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white text-xs line-clamp-1">{prop.title}</div>
                          <div className="text-[10px] text-slate-400">{prop.propertyType} &bull; {prop.bedrooms} Bed &bull; {prop.bathrooms} Bath</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-white">{prop.host?.firstName} {prop.host?.lastName}</div>
                      <div className="text-[10px] text-slate-400">{prop.host?.email}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-200">{prop.city}, {prop.country}</div>
                    </td>
                    <td className="py-4 px-4 font-extrabold text-emerald-400 text-sm">
                      ${prop.basePrice?.toLocaleString()}
                    </td>

                    {activeTab === 'REMOVAL' && (
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-purple-300 text-[11px] line-clamp-2">Reason: "{prop.removalReason}"</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Upcoming Stays: <strong className="text-amber-400">{prop.upcomingBookingsCount}</strong> &bull; Revenue: <strong className="text-emerald-400">${prop.totalRevenue}</strong>
                        </div>
                      </td>
                    )}

                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        prop.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        prop.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        prop.status === 'REMOVAL_REQUESTED' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        prop.status === 'UNPUBLISHED' ? 'bg-slate-800 text-slate-400' :
                        prop.status === 'ARCHIVED' ? 'bg-slate-950 text-slate-500' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {prop.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/properties/${prop.id}`}
                          target="_blank"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Preview Listing Page"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleOpenStatusHistory(prop)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-[10px]"
                          title="View Status History"
                        >
                          History
                        </button>

                        {/* Moderation Pending Actions */}
                        {prop.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleApprove(prop.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(prop, 'LISTING_REJECT')}
                              className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px]"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Removal Request Actions */}
                        {prop.status === 'REMOVAL_REQUESTED' && (
                          <>
                            <button
                              onClick={() => handleApproveRemoval(prop.id)}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px]"
                            >
                              Approve Removal
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(prop, 'REMOVAL_REJECT')}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px]"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {/* Archive & Restore Actions */}
                        {prop.status === 'ARCHIVED' ? (
                          <>
                            <button
                              onClick={() => handleRestore(prop.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-[11px]"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handleHardDelete(prop.id)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[11px]"
                            >
                              Hard Delete
                            </button>
                          </>
                        ) : (
                          prop.status !== 'PENDING_APPROVAL' && prop.status !== 'REMOVAL_REQUESTED' && (
                            <button
                              onClick={() => setArchiveModalProperty(prop)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[11px]"
                            >
                              Archive
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectModalProperty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 max-w-lg w-full space-y-4 shadow-2xl">
            <h2 className="text-xl font-extrabold text-white">
              {rejectType === 'LISTING_REJECT' ? 'Reject Property Listing' : 'Decline Removal Request'}
            </h2>
            <p className="text-xs text-slate-400">
              Provide feedback for <strong className="text-white">{rejectModalProperty.title}</strong>. This reason will be sent to the host.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Reason / Feedback (Required)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the specific reason or required modifications..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalProperty(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/20"
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Property Confirmation Modal */}
      {archiveModalProperty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 max-w-lg w-full space-y-4 shadow-2xl">
            <h2 className="text-xl font-extrabold text-white">Archive Property Listing</h2>
            <p className="text-xs text-slate-400">
              Are you sure you want to archive <strong className="text-white">{archiveModalProperty.title}</strong>?
            </p>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between">
                <span>Property Owner:</span>
                <span className="font-bold text-white">{archiveModalProperty.host?.firstName} {archiveModalProperty.host?.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Status:</span>
                <span className="font-bold text-amber-400">{archiveModalProperty.status}</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                This property will no longer appear in public search. Historical booking receipts, payments, and guest reviews will be preserved.
              </p>
            </div>

            <form onSubmit={handleArchiveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Administrative Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Host requested archive, Safety review..."
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setArchiveModalProperty(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/20"
                >
                  Archive Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Property Status History Modal */}
      {historyModalProperty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 max-w-xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-white">Status Audit History</h2>
                <p className="text-xs text-slate-400">{historyModalProperty.title}</p>
              </div>
              <button
                onClick={() => setHistoryModalProperty(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading audit history...</div>
              ) : statusHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No status transitions recorded yet.</div>
              ) : (
                statusHistory.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sky-400">
                        {item.previousStatus} &rarr; {item.newStatus}
                      </span>
                      <span className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-300 text-[11px]">{item.reason || 'No description provided'}</div>
                    <div className="text-[10px] text-slate-500 pt-1">
                      Changed by: <strong className="text-slate-300">{item.changedByUser?.firstName} {item.changedByUser?.lastName}</strong> ({item.changedByUser?.role})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
