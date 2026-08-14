import React, { useState, useEffect } from 'react';
import { X, Shield, AlertTriangle, CheckCircle, Ban, Lock, UserX, AlertCircle, Calendar, Building, DollarSign, Activity, FileText } from 'lucide-react';
import { apiClient } from '../../api/client';

interface UserModerationModalProps {
  userId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const UserModerationModal: React.FC<UserModerationModalProps> = ({ userId, onClose, onUpdated }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'moderation' | 'warning' | 'reservations' | 'warnings' | 'logs'>('moderation');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [modReason, setModReason] = useState('');
  const [warnReason, setWarnReason] = useState('');
  const [warnSeverity, setWarnSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE'>('MEDIUM');
  const [selectedRole, setSelectedRole] = useState<string>('GUEST');

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/admin/users/${userId}`);
      setUser(res.data.data);
      setSelectedRole(res.data.data.role);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (action: 'SUSPEND' | 'UNSUSPEND' | 'BLOCK' | 'UNBLOCK' | 'BAN' | 'UNBAN' | 'DEACTIVATE' | 'REACTIVATE') => {
    try {
      setSubmitting(true);
      setError(null);
      await apiClient.patch(`/admin/users/${userId}/moderation`, {
        action,
        reason: modReason.trim() || undefined,
      });
      setModReason('');
      await fetchUserDetails();
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warnReason.trim()) {
      setError('Please provide a warning reason');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiClient.post(`/admin/users/${userId}/warnings`, {
        reason: warnReason.trim(),
        severity: warnSeverity,
      });
      setWarnReason('');
      await fetchUserDetails();
      setActiveTab('warnings');
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to issue warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await apiClient.patch(`/admin/users/${userId}/role`, {
        role: selectedRole,
      });
      await fetchUserDetails();
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setSubmitting(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-panel rounded-3xl border border-slate-800 bg-[#0b0e17] text-slate-100 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-400 font-extrabold flex items-center justify-center text-lg border border-sky-500/30">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{user?.firstName} {user?.lastName}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                  {user?.role}
                </span>
                {user?.isSuspended && <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs">SUSPENDED</span>}
                {user?.isBlocked && <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold text-xs">BLOCKED</span>}
                {user?.isBanned && <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs">BANNED</span>}
                {!user?.isActive && !user?.isBanned && <span className="px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-400 font-bold text-xs">DEACTIVATED</span>}
                {user?.isActive && !user?.isSuspended && !user?.isBlocked && !user?.isBanned && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">ACTIVE</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{user?.email} &bull; ID: <span className="font-mono text-[11px] text-slate-500">{user?.id}</span></p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-900/40 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors border-b-2 ${activeTab === 'moderation' ? 'border-sky-500 bg-sky-500/10 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Shield className="w-3.5 h-3.5 inline mr-1.5" /> Moderation Controls
          </button>
          <button
            onClick={() => setActiveTab('warning')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors border-b-2 ${activeTab === 'warning' ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" /> Issue Warning
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors border-b-2 ${activeTab === 'reservations' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1.5" /> Activity & Reservations ({user?.stats?.totalBookings || 0})
          </button>
          <button
            onClick={() => setActiveTab('warnings')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors border-b-2 ${activeTab === 'warnings' ? 'border-rose-500 bg-rose-500/10 text-rose-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5" /> Warnings & Reports ({user?.stats?.warningsCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors border-b-2 ${activeTab === 'logs' ? 'border-slate-500 bg-slate-800 text-slate-200 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Activity className="w-3.5 h-3.5 inline mr-1.5" /> Audit History
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading user account telemetry...</div>
          ) : (
            <>
              {/* TAB 1: MODERATION CONTROLS */}
              {activeTab === 'moderation' && (
                <div className="space-y-6">
                  {/* Status Overview Card */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Spent</span>
                      <p className="text-xl font-extrabold text-emerald-400">${user?.stats?.totalSpent?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Bookings</span>
                      <p className="text-xl font-extrabold text-white">{user?.stats?.totalBookings || 0}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Hosted Properties</span>
                      <p className="text-xl font-extrabold text-indigo-400">{user?.stats?.hostedPropertiesCount || 0}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Warnings Received</span>
                      <p className="text-xl font-extrabold text-amber-400">{user?.stats?.warningsCount || 0}</p>
                    </div>
                  </div>

                  {/* Account Action Input */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-sky-400" /> Account Moderation Actions
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Moderation Reason / Enforcement Note (Required for Restrictions)
                      </label>
                      <input
                        type="text"
                        value={modReason}
                        onChange={(e) => setModReason(e.target.value)}
                        placeholder="e.g. Violation of guest policy / fraudulent booking attempts..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                      {!user?.isSuspended ? (
                        <button
                          disabled={submitting}
                          onClick={() => handleModerationAction('SUSPEND')}
                          className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Suspend User
                        </button>
                      ) : (
                        <button
                          disabled={submitting}
                          onClick={() => handleModerationAction('UNSUSPEND')}
                          className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Unsuspend User
                        </button>
                      )}

                      {!user?.isBlocked ? (
                        <button
                          disabled={submitting}
                          onClick={() => handleModerationAction('BLOCK')}
                          className="px-4 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" /> Block User
                        </button>
                      ) : (
                        <button
                          disabled={submitting}
                          onClick={() => handleModerationAction('UNBLOCK')}
                          className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Unblock User
                        </button>
                      )}

                      {!user?.isBanned ? (
                        <button
                          disabled={submitting}
                          onClick={() => handleModerationAction('BAN')}
                          className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" /> Ban Permanently
                        </button>
                      ) : (
                        <button
                          disabled={submitting}
                          onClick={() => handleModerationAction('UNBAN')}
                          className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Unban User
                        </button>
                      )}

                      {user?.isActive ? (
                        <button
                          disabled={submitting}
                          onClick={() => handleModerationAction('DEACTIVATE')}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <UserX className="w-3.5 h-3.5" /> Deactivate Account
                        </button>
                      ) : (
                        <button
                          disabled={submitting}
                          onClick={() => handleModerationAction('REACTIVATE')}
                          className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Reactivate Account
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Role Assignment */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">System Access Role</h4>
                      <p className="text-[11px] text-slate-400">Change platform permissions (GUEST, HOST, ADMIN)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-semibold focus:outline-none focus:border-sky-500"
                      >
                        <option value="GUEST">GUEST</option>
                        <option value="HOST">HOST</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPPORT_AGENT">SUPPORT AGENT</option>
                      </select>
                      <button
                        onClick={handleRoleChange}
                        disabled={submitting || selectedRole === user?.role}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-all"
                      >
                        Update Role
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ISSUE WARNING */}
              {activeTab === 'warning' && (
                <form onSubmit={handleIssueWarning} className="space-y-5">
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Issue Formal Account Warning
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Warning Severity</label>
                      <div className="grid grid-cols-4 gap-3">
                        {(['LOW', 'MEDIUM', 'HIGH', 'SEVERE'] as const).map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setWarnSeverity(sev)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${warnSeverity === sev ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Warning Explanation & Policy Citation</label>
                      <textarea
                        rows={4}
                        value={warnReason}
                        onChange={(e) => setWarnReason(e.target.value)}
                        placeholder="Detail the specific user behavior or policy violation..."
                        className="w-full p-4 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !warnReason.trim()}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
                    >
                      Send Official Warning Notification
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: RESERVATIONS & PROPERTIES */}
              {activeTab === 'reservations' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Reservation Records ({user?.bookings?.length || 0})</h3>
                    {user?.bookings?.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No reservation records found for this user.</p>
                    ) : (
                      <div className="space-y-2">
                        {user?.bookings?.map((b: any) => (
                          <div key={b.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sky-400">#{b.bookingNumber}</span>
                                <span className="text-slate-200 font-semibold">{b.property?.title}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()} &bull; Total: ${b.totalPrice}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] uppercase">{b.status}</span>
                              <a
                                href={`/admin/bookings?search=${b.bookingNumber}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-[11px] font-bold"
                              >
                                View in Ledger &rarr;
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {user?.role === 'HOST' && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Hosted Property Listings ({user?.properties?.length || 0})</h3>
                      <div className="space-y-2">
                        {user?.properties?.map((p: any) => (
                          <div key={p.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                                {p.images?.[0] ? (
                                  <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Building className="w-5 h-5 m-2 text-slate-600" />
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-100">{p.title}</span>
                                <div className="text-[11px] text-slate-400">{p.city}, {p.country} &bull; ${p.basePrice}/night</div>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase">{p.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: WARNINGS & REPORTS */}
              {activeTab === 'warnings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Official Warnings Issued ({user?.warningsReceived?.length || 0})</h3>
                    {user?.warningsReceived?.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No warnings issued to this user.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {user?.warningsReceived?.map((w: any) => (
                          <div key={w.id} className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/30 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px] uppercase">
                                {w.severity} Severity Warning
                              </span>
                              <span className="text-slate-500 font-mono text-[11px]">{new Date(w.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-200 mt-1 font-medium">{w.reason}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Issued by Admin: {w.admin?.email || 'System'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Misconduct Reports Against User ({user?.reportsReceived?.length || 0})</h3>
                    {user?.reportsReceived?.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No reports filed against this user.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {user?.reportsReceived?.map((r: any) => (
                          <div key={r.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-rose-400">{r.reason}</span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">{r.status}</span>
                            </div>
                            {r.details && <p className="text-slate-300 text-[11px]">{r.details}</p>}
                            <p className="text-[10px] text-slate-500">Reported by: {r.reporter?.email} on {new Date(r.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT HISTORY */}
              {activeTab === 'logs' && (
                <div className="space-y-2">
                  {user?.auditLogs?.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No security audit logs found for this user.</p>
                  ) : (
                    user?.auditLogs?.map((log: any) => (
                      <div key={log.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-extrabold text-[10px]">
                            {log.action}
                          </span>
                          <span className="text-slate-300 font-medium">{log.resource}</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
