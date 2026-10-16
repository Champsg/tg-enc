import React from 'react';
import { X, ShieldCheck, Copy, Check } from 'lucide-react';
import { generateFingerprintGrid } from '../utils/qrcode.ts';

interface SafetyNumberModalProps {
  safetyNumber: string;
  friendName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  safetyNumber,
  friendName,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const grid = generateFingerprintGrid(safetyNumber);
  const groups = safetyNumber.split(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-[#17212b] border border-[#2b394a] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#202b36] transition-colors"
          title="Close"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-[#2481cc]/20 border border-[#2481cc]/40 flex items-center justify-center mx-auto mb-3 text-[#54a9eb]">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          Encryption Safety Number
        </h3>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Compare this 60-digit number or visual pattern with <strong className="text-slate-200">{friendName}</strong>. If both screens match, your connection is guaranteed private and unmonitored.
        </p>

        {/* Visual Fingerprint Matrix */}
        <div className="p-3 bg-white rounded-xl inline-block mb-5 shadow-inner">
          <div className="grid grid-cols-17 gap-0.5 w-36 h-36">
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

        {/* 60 Digits Display */}
        <div className="bg-[#202b36] rounded-xl p-3 border border-[#2b394a] mb-5">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center font-mono text-xs text-slate-200 tracking-wider">
            {groups.map((grp, idx) => (
              <span key={idx} className="bg-[#17212b] py-1 px-1.5 rounded border border-[#242f3d]">
                {grp}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-2.5 px-4 rounded-xl bg-[#2481cc] hover:bg-[#2072b5] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Safety Number Copied!' : 'Copy Safety Number'}
        </button>
      </div>
    </div>
  );
};
