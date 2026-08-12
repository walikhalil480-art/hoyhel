import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, PlusSquare, Eye, Calendar, DollarSign, Edit, LayoutDashboard, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { getImageUrl } from '../utils/imageUtils';

export const HostPropertiesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRemovalProperty, setSelectedRemovalProperty] = useState<any>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [submittingRemoval, setSubmittingRemoval] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchHostProperties();
  }, []);

  const fetchHostProperties = async () => {
    try {
      setLoading(true);
      if (!user) return;
      const res = await apiClient.get('/properties', {
        params: { hostId: user.id, limit: 50 },
      });
      setProperties(res.data.data || []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublish = async (propertyId: string) => {
    try {
      setActionError(null);
      await apiClient.post(`/properties/${propertyId}/unpublish`);
      fetchHostProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to unpublish property');
    }
  };

  const handleRepublish = async (propertyId: string) => {
    try {
      setActionError(null);
      await apiClient.post(`/properties/${propertyId}/republish`);
      fetchHostProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to republish property');
    }
  };

  const handleSubmitApproval = async (propertyId: string) => {
    try {
      setActionError(null);
      await apiClient.post(`/properties/${propertyId}/submit-approval`);
      fetchHostProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to submit property for approval');
    }
  };

  const handleRequestRemovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRemovalProperty || !removalReason.trim()) return;

    try {
      setSubmittingRemoval(true);
      setActionError(null);
      await apiClient.post(`/properties/${selectedRemovalProperty.id}/request-removal`, {
        reason: removalReason,
      });
      setSelectedRemovalProperty(null);
      setRemovalReason('');
      fetchHostProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to submit property removal request');
    } finally {
      setSubmittingRemoval(false);
    }
  };

  const handleCancelRemovalRequest = async (propertyId: string) => {
    try {
      setActionError(null);
      await apiClient.post(`/properties/${propertyId}/cancel-removal`);
      fetchHostProperties();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to cancel removal request');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
            <Building2 className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">My Properties</h1>
            <p className="text-xs text-slate-400">Manage your luxury stay portfolio, track lifecycle status, and configure availability</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/host/dashboard"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/host/add-property"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
          >
            <PlusSquare className="w-4 h-4" /> + List Your Property
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
          {actionError}
        </div>
      )}

      {/* Properties List */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-800">
          Loading your luxury properties...
        </div>
      ) : properties.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-4 border border-sky-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-white mb-2">No Properties Listed Yet</h2>
          <p className="text-xs text-slate-400 mb-6">Start sharing your luxury space with global travelers to earn revenue.</p>
          <Link
            to="/host/add-property"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs transition-colors"
          >
            <PlusSquare className="w-4 h-4" /> List Your Property Now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={property.id} className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col group hover:border-slate-700 transition-all shadow-xl">
              <div className="relative h-48 overflow-hidden bg-slate-900">
                <img
                  src={getImageUrl(property.images?.[0]?.url)}
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold shadow-lg backdrop-blur-md ${
                    property.status === 'PUBLISHED' ? 'bg-emerald-500/90 text-white border border-emerald-400/40' :
                    property.status === 'REJECTED' ? 'bg-rose-500/90 text-white border border-rose-400/40' :
                    property.status === 'UNPUBLISHED' ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                    property.status === 'REMOVAL_REQUESTED' ? 'bg-purple-500/90 text-white border border-purple-400/40' :
                    property.status === 'ARCHIVED' ? 'bg-slate-950 text-slate-400 border border-slate-800' :
                    'bg-amber-500/90 text-white border border-amber-400/40'
                  }`}>
                    {property.status}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-extrabold text-white text-base mb-1 line-clamp-1">{property.title}</h3>
                  <div className="text-xs text-slate-400 mb-2">{property.city}, {property.country} &bull; {property.propertyType}</div>
                  
                  {/* Rejection Alert Callout */}
                  {property.status === 'REJECTED' && property.rejectionReason && (
                    <div className="p-3 mb-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 space-y-1">
                      <span className="font-bold block">Rejection Feedback:</span>
                      <span>{property.rejectionReason}</span>
                    </div>
                  )}

                  {/* Removal Request Callout */}
                  {property.status === 'REMOVAL_REQUESTED' && (
                    <div className="p-3 mb-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-300 space-y-1">
                      <span className="font-bold block">Removal Under Review:</span>
                      <span>{property.removalReason || 'Host requested property removal'}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400">{property.bedrooms} beds &bull; {property.bathrooms} baths</span>
                    <span className="font-extrabold text-emerald-400 text-sm">${property.basePrice}/night</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800">
                  <Link
                    to={`/properties/${property.id}`}
                    target="_blank"
                    className="flex-1 py-2 px-3 text-center rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </Link>

                  {property.status === 'DRAFT' && (
                    <button
                      onClick={() => handleSubmitApproval(property.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Submit
                    </button>
                  )}

                  {property.status === 'REJECTED' && (
                    <button
                      onClick={() => handleSubmitApproval(property.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Resubmit
                    </button>
                  )}

                  {property.status === 'PUBLISHED' && (
                    <button
                      onClick={() => handleUnpublish(property.id)}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                    >
                      Unpublish
                    </button>
                  )}

                  {property.status === 'UNPUBLISHED' && (
                    <button
                      onClick={() => handleRepublish(property.id)}
                      className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs border border-emerald-500/30 transition-colors"
                    >
                      Republish
                    </button>
                  )}

                  {property.status === 'REMOVAL_REQUESTED' ? (
                    <button
                      onClick={() => handleCancelRemovalRequest(property.id)}
                      className="py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold text-xs border border-purple-500/30 transition-colors"
                    >
                      Cancel Request
                    </button>
                  ) : (
                    property.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => setSelectedRemovalProperty(property)}
                        className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 transition-colors"
                      >
                        Remove
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Property Removal Request Modal */}
      {selectedRemovalProperty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 max-w-lg w-full space-y-4 shadow-2xl">
            <h2 className="text-xl font-extrabold text-white">Request Property Removal</h2>
            <p className="text-xs text-slate-400">
              You are requesting removal for <strong className="text-white">{selectedRemovalProperty.title}</strong>.
            </p>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
              <span className="font-bold block">Important Notice regarding Existing Stays:</span>
              <span>
                If your property has upcoming confirmed guest stays, your listing will transition to <strong>REMOVAL_REQUESTED</strong>. Existing confirmed guests will retain their reservations. Platform admins will review your request before final archiving.
              </span>
            </div>

            <form onSubmit={handleRequestRemovalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Reason for Removal</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Please state why you wish to remove this property (e.g., Sold property, Personal use, Renovations)..."
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRemovalProperty(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRemoval}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  {submittingRemoval ? 'Submitting...' : 'Submit Removal Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
