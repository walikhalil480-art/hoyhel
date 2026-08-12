import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Check, Clock, Info, Trash2, ExternalLink, AlertTriangle, MessageSquare, ShieldAlert, Sparkles, Building2, CreditCard } from 'lucide-react';
import { apiClient } from '../api/client';
import { getSocket } from '../api/socket';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications', { params: { limit: 15 } });
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.meta?.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
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
    setIsOpen(false);
    if (n.actionUrl) {
      navigate(n.actionUrl);
    }
  };

  const getCategoryIcon = (type: string) => {
    if (type.includes('HOST_APPLICATION')) return <Sparkles className="w-4 h-4 text-amber-400" />;
    if (type.includes('PROPERTY')) return <Building2 className="w-4 h-4 text-sky-400" />;
    if (type.includes('PAYMENT') || type.includes('REFUND')) return <CreditCard className="w-4 h-4 text-emerald-400" />;
    if (type.includes('MESSAGE')) return <MessageSquare className="w-4 h-4 text-indigo-400" />;
    if (type.includes('SECURITY') || type.includes('SUSPENDED')) return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    return <Bell className="w-4 h-4 text-sky-400" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-sky-400 relative transition-all"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-extrabold text-[9px] flex items-center justify-center border border-slate-900 shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-xs">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-extrabold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-sky-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="font-bold text-white text-xs">You're all caught up</div>
                <p className="text-[11px] text-slate-400">No new notifications.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 flex items-start gap-3 transition-all text-xs cursor-pointer ${
                    !n.isRead ? 'bg-sky-500/5 hover:bg-sky-500/10 border-l-2 border-sky-500' : 'hover:bg-slate-900/50 opacity-80'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-extrabold text-white text-xs line-clamp-1">{n.title}</span>
                      {n.priority === 'HIGH' || n.priority === 'CRITICAL' ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {n.priority}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed mb-1.5 line-clamp-2">{n.message}</p>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {n.actionUrl && (
                        <span className="text-sky-400 font-bold hover:underline flex items-center gap-0.5 text-[9px]">
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={(e) => markAsRead(n.id, e)}
                        className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => deleteNotification(n.id, e)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="text-xs font-extrabold text-sky-400 hover:text-sky-300 transition-colors"
            >
              View All Notifications &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
