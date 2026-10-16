import React from 'react';
import { Shield, ShieldAlert, Lock, EyeOff, Users, Key } from 'lucide-react';
import type { UserSession, PeerState } from '../types/chat.ts';

interface HeaderProps {
  session: UserSession | null;
  peer: PeerState | null;
  onOpenSafetyModal: () => void;
  onOpenSupabaseModal: () => void;
  onTriggerShield: () => void;
  onTriggerPanicWipe: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  peer,
  onOpenSafetyModal,
  onOpenSupabaseModal,
  onTriggerShield,
  onTriggerPanicWipe,
  onToggleSidebar,
}) => {
  return (
    <header className="h-14 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between px-4 lg:px-6 select-none shrink-0 z-30">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 -ml-2 text-slate-300 hover:text-white rounded-lg hover:bg-[#202b36] transition-colors"
            title="Toggle Sidebar"
            aria-label="Toggle navigation drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#2481cc] flex items-center justify-center text-white shadow-sm shadow-[#2481cc]/20">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 whitespace-nowrap">
              Telegram Secret
              <span className="text-[10px] font-semibold text-[#54a9eb] bg-[#2481cc]/20 px-1.5 py-0.2 rounded font-mono">
                E2EE
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Room Info, Supabase Cloud & Fingerprint */}
      {session && (
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#54a9eb]" />
            <span className="text-slate-300 font-medium">
              {peer?.isOnline ? (
                <span className="text-emerald-400 font-medium">Friend Online</span>
              ) : (
                <span className="text-amber-400/90 font-medium">Waiting for friend</span>
              )}
            </span>
          </div>

          <span className="text-slate-600">·</span>

          <button
            onClick={onOpenSupabaseModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-100 transition-colors border border-emerald-800/40"
            title="Supabase Cloud Realtime Connected"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-medium">Supabase Cloud</span>
          </button>

          <span className="text-slate-600">·</span>

          <button
            onClick={onOpenSafetyModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#202b36] hover:bg-[#242f3d] text-slate-300 hover:text-white transition-colors border border-[#2b394a]"
            title="Verify end-to-end encryption safety number"
          >
            <Key className="w-3.5 h-3.5 text-[#54a9eb]" />
            <span>Safety Number</span>
          </button>
        </div>
      )}

      {/* Zone 3: Privacy Controls (Shield & Panic Wipe) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onTriggerShield}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202b36] hover:bg-[#2b394a] text-slate-300 hover:text-white text-xs font-medium transition-colors border border-[#242f3d]"
          title="Instantly blur screen to protect privacy"
        >
          <EyeOff className="w-3.5 h-3.5 text-[#54a9eb]" />
          <span className="hidden sm:inline">Screen Shield</span>
        </button>

        <button
          onClick={onTriggerPanicWipe}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs font-medium transition-colors border border-rose-800/40"
          title="Panic Wipe: Instantly purge all messages from device and cloud"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Panic Wipe</span>
        </button>
      </div>
    </header>
  );
};
