import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Check, Clock, Trash2, ExternalLink, ShieldAlert, Sparkles, Building2, CreditCard, MessageSquare, Filter } from 'lucide-react';
import { apiClient } from '../api/client';
import { getSocket } from '../api/socket';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    if (socket) {
      const handleRealtimeNotification = (newNotif: any) => {
        setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
        setUnreadCount((prev) => prev + 1);
      };

      socket.on('notification', handleRealtimeNotification);
      return () => {
        socket.off('notification', handleRealtimeNotification);
      };
    }
  }, [page, unreadOnly]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/notifications', {
        params: { page, limit: 15, unreadOnly },
      });
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.meta?.unreadCount || 0);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Fallback
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Fallback
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Fallback
    }
  };

  const handleNotificationClick = (n: any) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    if (n.actionUrl) {
      navigate(n.actionUrl);
    }
  };

  const getCategoryIcon = (type: string) => {
    if (type.includes('HOST_APPLICATION')) return <Sparkles className="w-5 h-5 text-amber-400" />;
    if (type.includes('PROPERTY')) return <Building2 className="w-5 h-5 text-sky-400" />;
    if (type.includes('PAYMENT') || type.includes('REFUND')) return <CreditCard className="w-5 h-5 text-emerald-400" />;
    if (type.includes('MESSAGE')) return <MessageSquare className="w-5 h-5 text-indigo-400" />;
    if (type.includes('SECURITY') || type.includes('SUSPENDED')) return <ShieldAlert className="w-5 h-5 text-rose-400" />;
    return <Bell className="w-5 h-5 text-sky-400" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
            <Bell className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Notifications Hub</h1>
            <p className="text-xs text-slate-400">Stay updated on stays, host applications, payments, and messaging alerts</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-extrabold text-xs flex items-center gap-2 border border-slate-700 transition-all"
          >
            <CheckCheck className="w-4 h-4" /> Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Toolbar / Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setUnreadOnly(false); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              !unreadOnly ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => { setUnreadOnly(true); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              unreadOnly ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            Unread Only ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl divide-y divide-slate-800/60">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="font-bold text-white text-base">No notifications found</div>
            <p className="text-slate-400">You have no notifications matching your current filter.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-5 flex items-start gap-4 transition-all text-xs cursor-pointer ${
                !n.isRead ? 'bg-sky-500/5 hover:bg-sky-500/10 border-l-4 border-sky-500' : 'hover:bg-slate-900/40 opacity-80'
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                {getCategoryIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-extrabold text-white text-sm line-clamp-1">{n.title}</h3>
                  {n.priority === 'HIGH' || n.priority === 'CRITICAL' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {n.priority}
                    </span>
                  ) : null}
                </div>
                <p className="text-slate-300 text-xs leading-relaxed mb-2">{n.message}</p>
                <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {new Date(n.createdAt).toLocaleString()}
                  </span>
                  {n.actionUrl && (
                    <span className="text-sky-400 font-bold hover:underline flex items-center gap-1">
                      Action Link <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!n.isRead && (
                  <button
                    onClick={(e) => markAsRead(n.id, e)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-400 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => deleteNotification(n.id, e)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 text-xs text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 disabled:opacity-40 text-slate-300 font-bold"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 disabled:opacity-40 text-slate-300 font-bold"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
