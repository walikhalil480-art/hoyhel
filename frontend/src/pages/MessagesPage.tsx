import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Search, CheckCheck, Clock, Building2, Calendar, User, Sparkles, Compass } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../api/socket';
import { getImageUrl } from '../utils/imageUtils';

export const MessagesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlConvId = searchParams.get('conversationId');

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [urlConvId]);

  useEffect(() => {
    if (!activeConv) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('join_conversation', activeConv.id);

      const handleNewMessage = (newMsg: any) => {
        if (newMsg.conversationId === activeConv.id) {
          setMessages((prev) => [...prev.filter((m) => m.id !== newMsg.id), newMsg]);
          scrollToBottom();

          // Auto mark as read if received message from other participant
          if (newMsg.senderId !== user?.id) {
            apiClient.patch(`/messaging/conversations/${activeConv.id}/read`).catch(() => {});
          }
        }
      };

      const handleMessagesRead = (data: any) => {
        if (data.conversationId === activeConv.id) {
          setMessages((prev) =>
            prev.map((m) => (m.senderId === user?.id ? { ...m, isRead: true } : m))
          );
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('messages_read', handleMessagesRead);

      return () => {
        socket.emit('leave_conversation', activeConv.id);
        socket.off('new_message', handleNewMessage);
        socket.off('messages_read', handleMessagesRead);
      };
    }
  }, [activeConv?.id, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/messaging/conversations');
      const convs = res.data.data || [];

      if (urlConvId) {
        const match = convs.find((c: any) => c.id === urlConvId);
        if (match) {
          setConversations(convs);
          selectConversation(match);
        } else {
          // Fetch newly created single conversation
          try {
            const singleRes = await apiClient.get(`/messaging/conversations/${urlConvId}`);
            const singleConv = singleRes.data.data;
            if (singleConv) {
              const merged = [singleConv, ...convs.filter((c: any) => c.id !== singleConv.id)];
              setConversations(merged);
              selectConversation(singleConv);
            } else {
              setConversations(convs);
              if (convs.length > 0) selectConversation(convs[0]);
            }
          } catch {
            setConversations(convs);
            if (convs.length > 0) selectConversation(convs[0]);
          }
        }
      } else {
        setConversations(convs);
        if (convs.length > 0) {
          selectConversation(convs[0]);
        }
      }
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv: any) => {
    setActiveConv(conv);
    try {
      const res = await apiClient.get(`/messaging/conversations/${conv.id}/messages`);
      setMessages(res.data.data || []);
      // Update unread count in conversations state
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      setMessages([]);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !activeConv || sending) return;

    const trimmedText = text.trim();
    setText('');

    try {
      setSending(true);
      const res = await apiClient.post(`/messaging/conversations/${activeConv.id}/messages`, {
        text: trimmedText,
      });

      const newMsg = res.data.data;
      setMessages((prev) => [...prev.filter((m) => m.id !== newMsg.id), newMsg]);
      scrollToBottom();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message');
      setText(trimmedText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const otherUser = c.guestId === user?.id ? c.host : c.guest;
    const name = `${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.toLowerCase();
    const title = (c.property?.title || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || title.includes(q);
  });

  const getOtherParticipant = (c: any) => {
    if (!c) return null;
    return c.guestId === user?.id ? c.host : c.guest;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
          <MessageSquare className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Real-Time Messaging Portal</h1>
          <p className="text-xs text-slate-400">Direct host & guest communication portal</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 h-[680px] overflow-hidden shadow-2xl">
        {/* Sidebar: Conversations List */}
        <div className="border-r border-slate-800 flex flex-col h-full bg-slate-950/50">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search hosts, guests, villas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
                <p>No conversations found.</p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const other = getOtherParticipant(c);
                const isSelected = activeConv?.id === c.id;
                const lastMsg = c.messages?.[0];

                return (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-sky-500/10 border border-sky-500/30'
                        : 'hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 border border-sky-500/30">
                      {other?.avatarUrl ? (
                        <img src={getImageUrl(other.avatarUrl)} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        `${other?.firstName?.[0] || 'U'}`
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-extrabold text-white text-xs line-clamp-1">
                          {other?.firstName} {other?.lastName}
                        </span>
                        {c.unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-sky-500 text-white font-extrabold text-[9px]">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-semibold line-clamp-1 mb-1">
                        {c.property?.title || 'Stay Inquiry'}
                      </p>
                      {lastMsg && (
                        <p className="text-[10px] text-slate-500 line-clamp-1 font-mono">
                          {lastMsg.text}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window Pane */}
        <div className="md:col-span-2 flex flex-col h-full bg-slate-900/40">
          {activeConv ? (
            <>
              {/* Chat Room Header Context Card */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/40">
                    {getOtherParticipant(activeConv)?.firstName?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      {getOtherParticipant(activeConv)?.firstName} {getOtherParticipant(activeConv)?.lastName}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Building2 className="w-3.5 h-3.5 text-sky-400" />
                      <span className="line-clamp-1 font-semibold">{activeConv.property?.title || 'LuxeHaven Property Stay'}</span>
                    </div>
                  </div>
                </div>

                {activeConv.booking && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-slate-200">#{activeConv.booking.bookingNumber}</span>
                  </div>
                )}
              </div>

              {/* Scrollable Message Bubbles */}
              <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-600" />
                    <div className="font-bold text-white text-xs">No messages yet</div>
                    <p className="text-[11px] text-slate-400">Start the conversation with {getOtherParticipant(activeConv)?.firstName}.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;

                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="text-[10px] text-slate-500 mb-1 font-mono px-1">
                          {isMe ? 'You' : msg.sender?.firstName} &bull; {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        <div
                          className={`max-w-[78%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-br-none shadow-lg shadow-sky-500/10'
                              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                          }`}
                        >
                          {msg.text}
                        </div>

                        {isMe && (
                          <div className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
                            {msg.isRead ? (
                              <span className="text-sky-400 font-bold flex items-center gap-0.5">
                                <CheckCheck className="w-3 h-3 text-sky-400" /> Read
                              </span>
                            ) : (
                              <span>Sent</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center gap-3">
                <textarea
                  rows={1}
                  placeholder={`Write a message to ${getOtherParticipant(activeConv)?.firstName || 'participant'}... (Press Enter to send)`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500 resize-none max-h-24"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/20 disabled:opacity-40 transition-all shrink-0"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                <MessageSquare className="w-7 h-7 text-sky-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base mb-1">No Active Conversation Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm">Select a conversation from the sidebar or open a published property to contact a host directly.</p>
              </div>
              <button
                onClick={() => navigate('/search')}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
              >
                <Compass className="w-4 h-4" /> Browse Luxury Stays
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
