import React, { useState } from 'react';
import { Send, AtSign, User, ArrowRight, Zap, Globe, MessageSquare } from 'lucide-react';
import { normalizeUsername } from '../crypto/crypto.ts';

interface AuthScreenProps {
  onJoin: (username: string, displayName: string) => Promise<string | null>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clean = normalizeUsername(username);
    if (!clean) {
      setError('Please enter a username.');
      return;
    }

    setLoading(true);
    try {
      const err = await onJoin(clean, displayName.trim() || clean);
      if (err) setError(err);
    } catch (err) {
      setError((err as Error).message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1621] flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#2481cc]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#1a5b8f]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#17212b] border border-[#242f3d] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#2481cc] flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-[#2481cc]/25">
            <Send className="w-8 h-8 -rotate-12 ml-0.5 mt-0.5" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Telegram Messenger</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Instant messaging on any phone or PC. Pick a handle to start chatting immediately.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Username Handle</label>
            <div className="flex items-center gap-2 bg-[#202b36] border border-[#2b394a] focus-within:border-[#2481cc] rounded-xl px-3.5 py-2.5 transition-colors">
              <AtSign className="w-4 h-4 text-[#54a9eb] shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(normalizeUsername(e.target.value));
                  setError('');
                }}
                placeholder="yourhandle"
                required
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent text-white placeholder-slate-500 outline-hidden font-mono text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Friends can message you at{' '}
              <span className="font-mono text-slate-200">@{username || 'yourhandle'}</span>
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Display Name (optional)</label>
            <div className="flex items-center gap-2 bg-[#202b36] border border-[#2b394a] focus-within:border-[#2481cc] rounded-xl px-3.5 py-2.5 transition-colors">
              <User className="w-4 h-4 text-[#54a9eb] shrink-0" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex"
                className="flex-1 bg-transparent text-white placeholder-slate-500 outline-hidden font-sans text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl px-3.5 py-2.5 text-rose-200 text-[11px] leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#2481cc] hover:bg-[#2072b5] disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#2481cc]/25 text-sm"
          >
            <span>{loading ? 'Starting…' : 'Start Messaging'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#242f3d] grid grid-cols-3 gap-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#54a9eb] shrink-0" />
            <span>Instant delivery</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#54a9eb] shrink-0" />
            <span>Works on phone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#54a9eb] shrink-0" />
            <span>Real-time sync</span>
          </div>
        </div>
      </div>
    </div>
  );
};
