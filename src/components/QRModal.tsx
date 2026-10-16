import React from 'react';
import { X, QrCode, Copy, Check, Share2 } from 'lucide-react';
import { generateFingerprintGrid } from '../utils/qrcode.ts';

interface QRModalProps {
  roomId: string;
  roomPasskey: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({
  roomId,
  roomPasskey,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const inviteLink = `${window.location.origin}/#room=${encodeURIComponent(roomId)}&key=${encodeURIComponent(roomPasskey)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const grid = generateFingerprintGrid(`${roomId}-${roomPasskey}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-[#17212b] border border-[#2b394a] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#202b36] transition-colors"
          title="Close"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-[#2481cc]/20 border border-[#2481cc]/40 flex items-center justify-center mx-auto mb-3 text-[#54a9eb]">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-white mb-1">
          Scan to Join Secret Chat
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Your friend can scan this visual room token or use the secret link to connect directly.
        </p>

        {/* QR Matrix */}
        <div className="p-4 bg-white rounded-2xl inline-block mb-4 shadow-xl">
          <div className="grid grid-cols-17 gap-0.5 w-44 h-44">
            {grid.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`${cell ? 'bg-slate-950' : 'bg-white'} w-full h-full`}
                />
              ))
            )}
          </div>
        </div>

        <div className="bg-[#202b36] p-2.5 rounded-xl border border-[#2b394a] text-left mb-4 text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
            Secret Room ID
          </div>
          <div className="text-slate-200 truncate select-all">{roomId}</div>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-2.5 px-4 rounded-xl bg-[#2481cc] hover:bg-[#2072b5] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Invite Link Copied!' : 'Copy Secret Invite Link'}
        </button>
      </div>
    </div>
  );
};
