import React from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface DeleteChatModalProps {
  isOpen: boolean;
  peerName: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteChatModal: React.FC<DeleteChatModalProps> = ({
  isOpen,
  peerName,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-[#17212b] border border-rose-900/60 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-center">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#202b36] transition-colors"
          title="Cancel"
          aria-label="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-800/60 flex items-center justify-center mx-auto mb-4 text-rose-400">
          <Trash2 className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2">Delete this chat?</h3>
        <p className="text-xs text-slate-300 mb-5 leading-relaxed">
          Every message, photo and voice note with{' '}
          <strong className="text-slate-100">{peerName}</strong> will be permanently
          erased for both of you. This cannot be undone.
        </p>

        <div className="bg-rose-950/30 border border-rose-900/40 rounded-xl p-3 text-left text-xs text-rose-200/90 flex items-start gap-2 mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <span>
            Chats normally stay forever. Deleting removes the conversation from the
            cloud so neither side can read it again.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl bg-[#202b36] hover:bg-[#283543] text-slate-200 text-xs font-semibold transition-colors border border-[#2b394a]"
          >
            Keep chat
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-rose-950/50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{busy ? 'Deleting…' : 'Delete chat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
