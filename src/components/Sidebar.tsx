import React, { useState } from 'react';
import {
  Search,
  Trash2,
  MessageSquarePlus,
  Loader2,
  LogOut,
  UserX,
  MessageSquare,
} from 'lucide-react';
import type { ChatSummary, LocalIdentity } from '../types/chat.ts';

interface SidebarProps {
  identity: LocalIdentity;
  chats: ChatSummary[];
  activeChatId: string | null;
  onOpenChat: (chat: ChatSummary) => void;
  onStartChat: (username: string) => Promise<string | null>;
  onDeleteChat: (chat: ChatSummary) => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

function formatListTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

export const Sidebar: React.FC<SidebarProps> = ({
  identity,
  chats,
  activeChatId,
  onOpenChat,
  onStartChat,
  onDeleteChat,
  onSignOut,
  onDeleteAccount,
  isOpen,
  onCloseMobile,
}) => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = query.trim().replace(/^@+/, '');
    if (!target) return;

    setSearching(true);
    setSearchError('');
    try {
      const error = await onStartChat(target);
      if (error) setSearchError(error);
      else setQuery('');
    } catch (err) {
      setSearchError((err as Error).message || 'Could not find user.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 bg-[#17212b] border-r border-[#242f3d] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* My account strip */}
        <div className="p-3 border-b border-[#242f3d] flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2481cc] to-[#1a5b8f] flex items-center justify-center text-white font-bold shrink-0">
            {(identity.displayName || identity.username).charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex-1 min-w-0 text-left"
            title="Account options"
          >
            <p className="text-sm font-semibold text-white truncate">
              {identity.displayName || identity.username}
            </p>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              @{identity.username}
            </p>
          </button>

          {showMenu && (
            <div className="absolute top-full left-3 right-3 mt-1 z-50 bg-[#1c2733] border border-[#2b394a] rounded-xl shadow-2xl overflow-hidden">
              <div className="px-3 py-2 text-[11px] text-slate-400 border-b border-[#242f3d] truncate">
                {identity.email || `@${identity.username}`}
              </div>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] text-slate-200 hover:bg-[#202b36] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-amber-400" />
                Sign Out
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDeleteAccount();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] text-rose-300 hover:bg-rose-950/40 transition-colors border-t border-[#242f3d]"
              >
                <UserX className="w-3.5 h-3.5" />
                Delete Account
              </button>
            </div>
          )}
        </div>

        {/* Find someone by username */}
        <form onSubmit={handleSearch} className="p-3 border-b border-[#242f3d]">
          <div className="flex items-center gap-2 bg-[#202b36] border border-[#2b394a] focus-within:border-[#2481cc] rounded-xl px-3 py-2 transition-colors">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchError('');
              }}
              placeholder="Start chat by @username or email"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-hidden font-mono min-w-0"
            />
            {query.trim() && (
              <button
                type="submit"
                disabled={searching}
                className="p-1 text-[#54a9eb] hover:text-white transition-colors shrink-0"
                title="Start chat"
                aria-label="Start chat"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquarePlus className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          {searchError && (
            <p className="text-[11px] text-amber-300/90 mt-2 leading-relaxed">{searchError}</p>
          )}
        </form>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-slate-500 text-xs px-6">
              <MessageSquare className="w-6 h-6 mb-2 opacity-40" />
              <span>No conversations yet</span>
              <span className="text-[10px] text-slate-600 mt-1">
                Search a friend's @username above to start chatting
              </span>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.chatId}
                onClick={() => onOpenChat(chat)}
                className={`group flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-[#1d2733] transition-colors ${
                  activeChatId === chat.chatId
                    ? 'bg-[#2481cc]/15 border-l-2 border-l-[#2481cc]'
                    : 'hover:bg-[#202b36]'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-[#202b36] border border-[#2b394a] flex items-center justify-center text-slate-200 font-semibold">
                    {(chat.peerName || chat.peerUsername).charAt(0).toUpperCase()}
                  </div>
                  {chat.unread && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-3 h-3 px-0.5 rounded-full bg-[#2481cc] border-2 border-[#17212b] flex items-center justify-center text-[8px] font-bold text-white">
                      •
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm truncate ${
                        chat.unread ? 'font-semibold text-white' : 'font-medium text-white/90'
                      }`}
                    >
                      {chat.peerName || `@${chat.peerUsername}`}
                    </p>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatListTime(chat.updatedAt)}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] truncate mt-0.5 ${
                      chat.unread ? 'text-slate-200 font-medium' : 'text-slate-400'
                    }`}
                  >
                    {chat.lastMessage || `@${chat.peerUsername}`}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat);
                  }}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Delete chat"
                  aria-label="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#242f3d] flex items-center justify-between text-[11px] text-slate-500">
          <span>Real-time Chat</span>
          <span className="text-emerald-400">● Connected</span>
        </div>
      </aside>
    </>
  );
};
