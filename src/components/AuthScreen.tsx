import React, { useState } from 'react';
import { Send, AtSign, User, ArrowRight, Zap, Globe, MessageSquare, UserCheck } from 'lucide-react';
import { normalizeUsername } from '../crypto/crypto.ts';

interface AuthScreenProps {
  onJoin: (identifier: string, displayName: string) => Promise<string | null>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onJoin }) => {
  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clean = identifier.trim();
    if (!clean) {
      setError('Please enter your username handle or email.');
      return;
    }

    setLoading(true);
    try {
      const err = await onJoin(clean, displayName.trim());
      if (err) setError(err);
    } catch (err) {
      setError((err as Error).message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (uname: string) => {
    setIdentifier(uname);
    onJoin(uname, '');
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
            Sign in to your existing account or choose a handle to get started.
          </p>
        </div>

        {/* Quick login for existing accounts */}
        <div className="mb-5 bg-[#202b36]/70 border border-[#2b394a] rounded-2xl p-3">
          <p className="text-[11px] text-slate-400 mb-2 flex items-center gap-1.5 font-medium">
            <UserCheck className="w-3.5 h-3.5 text-[#54a9eb]" />
            <span>Already have an account? Tap to sign in:</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('hey')}
              className="flex-1 py-2 px-3 rounded-xl bg-[#17212b] hover:bg-[#2481cc] hover:text-white border border-[#242f3d] text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>@hey</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('hey2')}
              className="flex-1 py-2 px-3 rounded-xl bg-[#17212b] hover:bg-[#2481cc] hover:text-white border border-[#242f3d] text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>@hey2</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Username Handle or Email
            </label>
            <div className="flex items-center gap-2 bg-[#202b36] border border-[#2b394a] focus-within:border-[#2481cc] rounded-xl px-3.5 py-2.5 transition-colors">
              <AtSign className="w-4 h-4 text-[#54a9eb] shrink-0" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError('');
                }}
                placeholder="e.g. hey, hey2, or your@email.com"
                required
                autoFocus
                autoComplete="username"
                spellCheck={false}
                className="flex-1 bg-transparent text-white placeholder-slate-500 outline-hidden font-mono text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Type your handle or email to sign straight in.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Display Name (only for new users)
            </label>
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
            disabled={loading || !identifier.trim()}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#2481cc] hover:bg-[#2072b5] disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#2481cc]/25 text-sm"
          >
            <span>{loading ? 'Signing in…' : 'Sign In / Start Messaging'}</span>
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
