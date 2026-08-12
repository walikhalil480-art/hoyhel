import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Heart, MessageSquare, PlusSquare, LayoutDashboard, LogOut, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { NotificationBell } from './NotificationBell';
import { apiClient } from '../api/client';
import { getSocket } from '../api/socket';
import { HoyHelLogo } from './HoyHelLogo';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [unreadMessages, setUnreadMessages] = React.useState(0);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadMessageCount();

      const socket = getSocket();
      if (socket) {
        const handleNewMsg = () => fetchUnreadMessageCount();
        const handleMsgRead = () => fetchUnreadMessageCount();
        socket.on('new_message', handleNewMsg);
        socket.on('messages_read', handleMsgRead);
        socket.on('notification', handleNewMsg);

        return () => {
          socket.off('new_message', handleNewMsg);
          socket.off('messages_read', handleMsgRead);
          socket.off('notification', handleNewMsg);
        };
      }
    }
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const fetchUnreadMessageCount = async () => {
    try {
      const res = await apiClient.get('/messaging/conversations/unread-count');
      setUnreadMessages(res.data.data?.unreadCount || 0);
    } catch {
      setUnreadMessages(0);
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group hover:opacity-95 transition-opacity">
          <HoyHelLogo variant="full" size="md" />
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link to="/" className="hover:text-sky-400 transition-colors">Explore</Link>
          <Link to="/search" className="hover:text-sky-400 transition-colors">Villas & Pent-houses</Link>
          {isAuthenticated && user && (
            (() => {
              const roles = user.roles || [user.role || 'GUEST'];
              if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
                return (
                  <Link to="/admin/bookings" className="flex items-center gap-1.5 hover:text-sky-400 transition-colors">
                    <Calendar className="w-4 h-4 text-indigo-400" /> Reservations Management
                  </Link>
                );
              }
              if (roles.includes('HOST')) {
                return (
                  <Link to="/host/bookings" className="flex items-center gap-1.5 hover:text-sky-400 transition-colors">
                    <Calendar className="w-4 h-4 text-sky-400" /> Property Bookings
                  </Link>
                );
              }
              return (
                <Link to="/my-reservations" className="flex items-center gap-1.5 hover:text-sky-400 transition-colors">
                  <Calendar className="w-4 h-4 text-sky-400" /> My Reservations
                </Link>
              );
            })()
          )}
          <Link to="/favorites" className="flex items-center gap-1.5 hover:text-sky-400 transition-colors">
            <Heart className="w-4 h-4 text-rose-400" /> Favorites
          </Link>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {!(user.roles || [user.role || 'GUEST']).includes('HOST') && !(user.roles || [user.role || 'GUEST']).includes('ADMIN') && (
                <Link
                  to="/become-a-host"
                  className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 text-xs font-semibold px-4 py-2 rounded-lg border border-amber-500/30 transition-colors"
                >
                  <PlusSquare className="w-4 h-4 text-amber-400" /> Become a Host
                </Link>
              )}
              {(user.roles || [user.role || 'GUEST']).includes('HOST') && (
                <Link
                  to="/host/add-property"
                  className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-md"
                >
                  <PlusSquare className="w-4 h-4" /> Add Property
                </Link>
              )}
              {(user.roles || [user.role || 'GUEST']).includes('ADMIN') && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold px-3 py-2 rounded-lg border border-indigo-500/40"
                >
                  <Shield className="w-4 h-4 text-indigo-400" /> Admin Console
                </Link>
              )}

              <NotificationBell />

              <Link to="/messages" className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-sky-400 relative transition-all" title="Messages">
                <MessageSquare className="w-5 h-5" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-extrabold text-[9px] flex items-center justify-center border border-slate-900 shadow-md">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </Link>

              <div className="relative group">
                <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 hover:border-sky-500/50 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                    {user.firstName[0]}
                  </div>
                  <span className="text-xs font-semibold text-slate-200">{user.firstName}</span>
                </button>
                <div className="absolute right-0 mt-2 w-52 py-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {(() => {
                    const roles = user.roles || [user.role || 'GUEST'];
                    if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
                      return (
                        <>
                          <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-xs text-indigo-400 hover:bg-slate-800">
                            <Shield className="w-4 h-4" /> Admin Console
                          </Link>
                          <Link to="/admin/bookings" className="flex items-center gap-2 px-4 py-2 text-xs text-indigo-400 hover:bg-slate-800">
                            <Calendar className="w-4 h-4" /> Reservations Management
                          </Link>
                        </>
                      );
                    }
                    if (roles.includes('HOST')) {
                      return (
                        <>
                          <Link to="/host/dashboard" className="flex items-center gap-2 px-4 py-2 text-xs text-sky-400 hover:bg-slate-800">
                            <LayoutDashboard className="w-4 h-4" /> Host Dashboard
                          </Link>
                          <Link to="/host/bookings" className="flex items-center gap-2 px-4 py-2 text-xs text-sky-400 hover:bg-slate-800">
                            <Calendar className="w-4 h-4" /> Property Bookings
                          </Link>
                          <Link to="/host/add-property" className="flex items-center gap-2 px-4 py-2 text-xs text-sky-400 hover:bg-slate-800">
                            <PlusSquare className="w-4 h-4" /> List Your Property
                          </Link>
                        </>
                      );
                    }
                    return (
                      <>
                        <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white">
                          <LayoutDashboard className="w-4 h-4" /> Guest Dashboard
                        </Link>
                        <Link to="/my-reservations" className="flex items-center gap-2 px-4 py-2 text-xs text-sky-400 hover:bg-slate-800">
                          <Calendar className="w-4 h-4" /> My Reservations
                        </Link>
                        <Link to="/become-a-host" className="flex items-center gap-2 px-4 py-2 text-xs text-amber-400 hover:bg-slate-800">
                          <PlusSquare className="w-4 h-4 text-amber-400" /> Become a Host
                        </Link>
                      </>
                    );
                  })()}
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-400 hover:bg-slate-800 text-left border-t border-slate-800/80 mt-1 pt-2">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2">
                Log In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-sky-500/25 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
