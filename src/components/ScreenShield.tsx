import React, { useState } from 'react';
import { Eye, Shield, Lock, ArrowRight } from 'lucide-react';

interface ScreenShieldProps {
  isActive: boolean;
  onUnlock: () => void;
}

export const ScreenShield: React.FC<ScreenShieldProps> = ({ isActive, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0e1621]/95 backdrop-blur-2xl flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#17212b] border border-[#2b394a] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-[#2481cc]/20 border border-[#2481cc]/40 flex items-center justify-center mx-auto mb-4 text-[#54a9eb] shadow-lg">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white mb-1.5">
          Privacy Shield Active
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Chat contents are blurred and shielded from nearby eyes. Tap below to resume your encrypted conversation.
        </p>

        <button
          onClick={onUnlock}
          className="w-full py-3 px-4 rounded-xl bg-[#2481cc] hover:bg-[#2072b5] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
        >
          <Eye className="w-4 h-4" />
          <span>Unlock Screen</span>
        </button>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>E2EE Session stays securely encrypted in memory</span>
        </div>
      </div>
    </div>
  );
};
