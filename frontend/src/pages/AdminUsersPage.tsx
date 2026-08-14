import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Search, Filter, Users, Calendar, Building, AlertTriangle, ChevronLeft, ChevronRight, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';
import { UserModerationModal } from '../components/admin/UserModerationModal';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Selected user for detail/moderation modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [search, role, statusFilter, page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/users', {
        params: {
          search: search || undefined,
          role: role || undefined,
          statusFilter: statusFilter || undefined,
          page,
          limit: 15,
        },
      });
      setUsers(res.data.data || []);
      setTotalUsers(res.data.meta?.total || 0);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center border border-indigo-500/40">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">User Management & Moderation</h1>
            <p className="text-xs text-slate-400">Search users, inspect activity, issue warnings, suspend or restrict accounts</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 glass-panel rounded-xl border border-slate-800 text-xs">
          <Link to="/admin" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium">
            Overview
          </Link>
          <span className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Users
          </span>
          <Link to="/admin/reports" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> User Reports
          </Link>
          <Link to="/admin/bookings" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-sky-400" /> Reservations
          </Link>
          <Link to="/admin/properties" className="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-indigo-400" /> Properties
          </Link>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by User Name, Email Address, or User ID..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-semibold focus:outline-none focus:border-sky-500"
            >
              <option value="">All Roles</option>
              <option value="GUEST">Guests</option>
              <option value="HOST">Hosts</option>
              <option value="ADMIN">Admins</option>
              <option value="SUPPORT_AGENT">Support Agents</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs font-semibold overflow-x-auto">
          {[
            { id: '', label: 'All Users' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'SUSPENDED', label: 'Suspended' },
            { id: 'BLOCKED', label: 'Blocked' },
            { id: 'BANNED', label: 'Banned' },
            { id: 'DEACTIVATED', label: 'Deactivated' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => {
                setStatusFilter(st.id);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${statusFilter === st.id ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Reservations</th>
                <th className="px-6 py-4 text-center">Properties</th>
                <th className="px-6 py-4 text-center">Warnings</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-400" />
                    Fetching user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No users matching the specified filter criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-400 font-extrabold flex items-center justify-center text-xs shrink-0 border border-sky-500/30">
                          {u.firstName?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{u.firstName} {u.lastName}</div>
                          <div className="text-slate-400 text-[11px]">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-[10px] uppercase">
                        {u.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {u.isSuspended && <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">SUSPENDED</span>}
                      {u.isBlocked && <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold text-[10px]">BLOCKED</span>}
                      {u.isBanned && <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">BANNED</span>}
                      {!u.isActive && !u.isBanned && <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold text-[10px]">DEACTIVATED</span>}
                      {u.isActive && !u.isSuspended && !u.isBlocked && !u.isBanned && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">ACTIVE</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-slate-200">
                      {u._count?.bookings || 0}
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-slate-200">
                      {u._count?.properties || 0}
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-amber-400">
                      {u._count?.warningsReceived || 0}
                    </td>

                    <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedUserId(u.id)}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect & Moderate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing total <span className="font-bold text-white">{totalUsers}</span> registered users
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Inspection & Moderation Modal */}
      {selectedUserId && (
        <UserModerationModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdated={fetchUsers}
        />
      )}
    </div>
  );
};
