import React from 'react';
import { Trash2, MessagesSquare, LogOut, MessageCircle } from 'lucide-react';
import type { ChatSummary, LocalIdentity, PeerState } from '../types/chat.ts';

interface HeaderProps {
  identity: LocalIdentity;
  activeChat: ChatSummary | null;
  peer: PeerState | null;
  onDeleteChat: () => void;
  onSignOut: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  identity,
  activeChat,
  peer,
  onDeleteChat,
  onSignOut,
  onToggleSidebar,
}) => {
  const title = activeChat ? activeChat.peerName || `@${activeChat.peerUsername}` : 'Telegram';
  const subtitle = activeChat
    ? peer?.isTyping
      ? 'typing…'
      : peer?.isOnline
        ? 'online'
        : `@${activeChat.peerUsername}`
    : `signed in as @${identity.username}`;

  return (
    <header className="h-14 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between px-3 lg:px-5 select-none shrink-0 z-30">
      {/* Zone 1: navigation + who you are talking to */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-[#202b36] transition-colors shrink-0"
            title="Toggle chat list"
            aria-label="Toggle chat list"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="w-9 h-9 rounded-full bg-[#2481cc] flex items-center justify-center text-white shadow-sm shadow-[#2481cc]/20 shrink-0 font-bold">
          {activeChat ? (
            <span className="text-sm">
              {(activeChat.peerName || activeChat.peerUsername).charAt(0).toUpperCase()}
            </span>
          ) : (
            <MessageCircle className="w-4 h-4" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-white tracking-tight truncate">{title}</span>
          <span
            className={`text-[11px] truncate ${
              peer?.isTyping
                ? 'text-[#54a9eb] animate-pulse'
                : peer?.isOnline
                  ? 'text-emerald-400'
                  : 'text-slate-400'
            }`}
          >
            {subtitle}
          </span>
        </div>
      </div>

      {/* Zone 2: chat actions */}
      <div className="flex items-center gap-2 shrink-0">
        {activeChat && (
          <button
            onClick={onDeleteChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs transition-colors border border-rose-800/40"
            title="Delete this chat"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Delete chat</span>
          </button>
        )}

        {!activeChat && (
          <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#202b36] text-slate-400 text-xs border border-[#2b394a]">
            <MessagesSquare className="w-3.5 h-3.5 text-[#54a9eb]" />
            <span>Select a chat</span>
          </span>
        )}

        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#202b36] hover:bg-[#283543] text-slate-300 hover:text-rose-300 text-xs transition-colors border border-[#2b394a]"
          title="Sign out of your account"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
