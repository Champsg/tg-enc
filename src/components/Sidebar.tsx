import React, { useState } from 'react';
import {
  ShieldCheck,
  Copy,
  Check,
  QrCode,
  Eye,
  EyeOff,
  Image as ImageIcon,
  FileText,
  Mic,
  LogOut,
  Sparkles,
  KeyRound,
  Download,
  Database,
} from 'lucide-react';
import type { UserSession, PeerState, DecryptedMessage } from '../types/chat.ts';

interface SidebarProps {
  session: UserSession;
  peer: PeerState | null;
  messages: DecryptedMessage[];
  onOpenSafetyModal: () => void;
  onOpenSupabaseModal: () => void;
  onOpenQRModal: () => void;
  onLeaveRoom: () => void;
  onSelectMedia: (msg: DecryptedMessage) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  session,
  peer,
  messages,
  onOpenSafetyModal,
  onOpenSupabaseModal,
  onOpenQRModal,
  onLeaveRoom,
  onSelectMedia,
  isOpen,
  onCloseMobile,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPasskey, setCopiedPasskey] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'all' | 'photos' | 'files' | 'audio'>('all');

  const inviteLink = `${window.location.origin}/#room=${encodeURIComponent(session.roomId)}&key=${encodeURIComponent(session.roomPasskey)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyPasskey = () => {
    navigator.clipboard.writeText(session.roomPasskey);
    setCopiedPasskey(true);
    setTimeout(() => setCopiedPasskey(false), 2200);
  };

  // Filter media files
  const mediaMessages = messages.filter((m) => m.type === 'file' || m.type === 'audio');
  const filteredMedia = mediaMessages.filter((m) => {
    if (activeMediaTab === 'all') return true;
    if (activeMediaTab === 'photos') return m.fileMetadata?.mimeType?.startsWith('image/');
    if (activeMediaTab === 'audio') return m.type === 'audio' || m.fileMetadata?.mimeType?.startsWith('audio/');
    if (activeMediaTab === 'files') return !m.fileMetadata?.mimeType?.startsWith('image/') && !m.fileMetadata?.mimeType?.startsWith('audio/');
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
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
        {/* User & Friend Profile Strip */}
        <div className="p-4 border-b border-[#242f3d]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Secret 1-on-1 Chat
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              E2E Encrypted
            </span>
          </div>

          <div className="flex items-center gap-3 bg-[#202b36] p-3 rounded-xl border border-[#2b394a]">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2481cc] to-[#1a5b8f] flex items-center justify-center text-white font-bold text-base shadow-inner">
                {peer?.name ? peer.name.charAt(0).toUpperCase() : 'F'}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#17212b] ${
                  peer?.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white truncate">
                  {peer?.name || 'Friend'}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                {peer?.isTyping ? (
                  <span className="text-[#54a9eb] animate-pulse">typing...</span>
                ) : peer?.isOnline ? (
                  <span className="text-emerald-400">online</span>
                ) : (
                  'waiting to connect'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Room Share & Invite Card */}
        <div className="p-4 border-b border-[#242f3d] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Invite Friend</span>
            <button
              onClick={onOpenQRModal}
              className="text-xs text-[#54a9eb] hover:text-white flex items-center gap-1 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              QR Code
            </button>
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#2481cc] hover:bg-[#2072b5] text-white text-xs font-medium transition-colors shadow-sm"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedLink ? 'Invite Link Copied!' : 'Copy Secret Invite Link'}
          </button>

          {/* Passkey Reveal Box */}
          <div className="bg-[#202b36] rounded-lg p-2.5 border border-[#2b394a] text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-[#54a9eb]" />
                Room Passkey
              </span>
              <button
                onClick={() => setShowPasskey(!showPasskey)}
                className="text-slate-400 hover:text-white transition-colors p-0.5"
                title={showPasskey ? 'Hide passkey' : 'Reveal passkey'}
              >
                {showPasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center justify-between font-mono bg-[#17212b] px-2 py-1.5 rounded border border-[#242f3d]">
              <span className="text-slate-200 select-all truncate">
                {showPasskey ? session.roomPasskey : '••••••••••••••••'}
              </span>
              <button
                onClick={handleCopyPasskey}
                className="text-[#54a9eb] hover:text-white ml-2 shrink-0 transition-colors"
                title="Copy passkey"
              >
                {copiedPasskey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Shared Media Feed */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-[#242f3d]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Shared Encrypted Media</span>
              <span className="text-[11px] text-slate-400">{mediaMessages.length} files</span>
            </div>

            {/* Filter buttons */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#202b36] rounded-lg text-[11px]">
              {(['all', 'photos', 'files', 'audio'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveMediaTab(tab)}
                  className={`py-1 rounded capitalize font-medium transition-colors ${
                    activeMediaTab === tab
                      ? 'bg-[#2481cc] text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Media Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredMedia.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-center text-slate-500 text-xs px-4">
                <FileText className="w-6 h-6 mb-1.5 opacity-40" />
                <span>No media shared yet</span>
                <span className="text-[10px] text-slate-600 mt-0.5">Files and photos appear here</span>
              </div>
            ) : (
              filteredMedia.map((m) => {
                const isImg = m.fileMetadata?.mimeType?.startsWith('image/');
                const isAudio = m.type === 'audio' || m.fileMetadata?.mimeType?.startsWith('audio/');

                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectMedia(m)}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-[#202b36] hover:bg-[#283543] border border-[#2b394a] cursor-pointer transition-colors group"
                  >
                    <div className="w-9 h-9 rounded bg-[#17212b] border border-[#2b394a] flex items-center justify-center shrink-0 overflow-hidden">
                      {isImg && m.content ? (
                        <img
                          src={m.content}
                          alt={m.fileMetadata?.fileName || 'Thumbnail'}
                          className="w-full h-full object-cover"
                        />
                      ) : isAudio ? (
                        <Mic className="w-4 h-4 text-[#54a9eb]" />
                      ) : (
                        <FileText className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate group-hover:text-white">
                        {m.fileMetadata?.fileName || (isAudio ? 'Voice Message' : 'Encrypted File')}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>{m.senderName}</span>
                        <span>·</span>
                        <span>
                          {m.fileMetadata?.fileSize
                            ? `${(m.fileMetadata.fileSize / 1024).toFixed(1)} KB`
                            : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    </div>
                    {m.fileBlobUrl && (
                      <a
                        href={m.fileBlobUrl}
                        download={m.fileMetadata?.fileName || 'decrypted-file'}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Security & Bottom Exit Strip */}
        <div className="p-3 border-t border-[#242f3d] bg-[#17212b] space-y-2">
          <button
            onClick={onOpenSupabaseModal}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 text-xs text-emerald-300 hover:text-emerald-100 transition-colors border border-emerald-800/40"
          >
            <span className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Supabase Cloud</span>
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/50">
              Active
            </span>
          </button>

          <button
            onClick={onOpenSafetyModal}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#202b36] hover:bg-[#283543] text-xs text-slate-300 hover:text-white transition-colors border border-[#2b394a]"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#54a9eb]" />
              <span>Verify Safety Number</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {session.safetyNumber.slice(0, 11)}...
            </span>
          </button>

          <button
            onClick={onLeaveRoom}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Session</span>
          </button>
        </div>
      </aside>
    </>
  );
};
