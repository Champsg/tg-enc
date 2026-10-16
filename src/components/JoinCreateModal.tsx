import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, ArrowRight, RefreshCw, KeyRound, Sparkles, Database } from 'lucide-react';
import { generateRoomId, generateRandomPasskey } from '../crypto/crypto.ts';

interface JoinCreateModalProps {
  onJoinOrCreate: (params: {
    username: string;
    roomId: string;
    roomPasskey: string;
    isHost: boolean;
  }) => void;
}

export const JoinCreateModal: React.FC<JoinCreateModalProps> = ({ onJoinOrCreate }) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomPasskey, setRoomPasskey] = useState('');
  const [detectedInvite, setDetectedInvite] = useState(false);

  // Check URL hash for shared invite params
  useEffect(() => {
    const parseHash = () => {
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const r = hashParams.get('room');
        const k = hashParams.get('key');
        if (r && k) {
          setRoomId(r);
          setRoomPasskey(k);
          setMode('join');
          setDetectedInvite(true);
          return;
        }
      }
      // If not an invite link, generate defaults for creation
      setRoomId(generateRoomId());
      setRoomPasskey(generateRandomPasskey());
    };

    parseHash();
  }, []);

  const handleRegenerate = () => {
    setRoomId(generateRoomId());
    setRoomPasskey(generateRandomPasskey());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = username.trim() || (mode === 'create' ? 'Me' : 'Friend');
    const finalRoom = roomId.trim();
    const finalPasskey = roomPasskey.trim();

    if (!finalRoom || !finalPasskey) {
      alert('Please provide both Room ID and Room Passkey.');
      return;
    }

    onJoinOrCreate({
      username: finalName,
      roomId: finalRoom,
      roomPasskey: finalPasskey,
      isHost: mode === 'create',
    });
  };

  return (
    <div className="min-h-screen bg-[#0e1621] flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#2481cc]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#1a5b8f]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#17212b] border border-[#242f3d] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xs">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#2481cc] flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-[#2481cc]/25">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            tg-enc
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            1-on-1 End-to-End Encrypted Cloud Messenger
          </p>
        </div>

        {detectedInvite && (
          <div className="mb-5 bg-[#202b36] border border-[#2481cc]/40 rounded-xl p-3 text-xs text-[#54a9eb] flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 text-[#54a9eb]" />
            <span>Invite link detected! Room credentials have been pre-filled.</span>
          </div>
        )}

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#202b36] rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`py-2 rounded-lg transition-all ${
              mode === 'create'
                ? 'bg-[#2481cc] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create New Room
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`py-2 rounded-lg transition-all ${
              mode === 'join'
                ? 'bg-[#2481cc] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Join Friend's Room
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Display Name Input */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Your Display Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'create' ? 'e.g. Alex' : 'e.g. Sam'}
              className="w-full bg-[#202b36] border border-[#2b394a] focus:border-[#2481cc] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-hidden transition-colors"
            />
          </div>

          {/* Room ID Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-medium">Room ID</label>
              {mode === 'create' && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="text-[#54a9eb] hover:text-white flex items-center gap-1 text-[11px] transition-colors"
                  title="Generate new credentials"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Randomize</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. k8m9x2zq"
              className="w-full bg-[#202b36] border border-[#2b394a] focus:border-[#2481cc] rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-500 outline-hidden transition-colors"
              required
            />
          </div>

          {/* Room Passkey Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#54a9eb]" />
                Room Passkey (Encryption Secret)
              </label>
            </div>
            <input
              type="text"
              value={roomPasskey}
              onChange={(e) => setRoomPasskey(e.target.value)}
              placeholder="Secret passkey or phrase"
              className="w-full bg-[#202b36] border border-[#2b394a] focus:border-[#2481cc] rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-500 outline-hidden transition-colors"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Used to derive your device-only AES-256 decryption key. Never transmitted to the server.
            </p>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            className="w-full mt-4 py-3 px-4 rounded-xl bg-[#2481cc] hover:bg-[#2072b5] active:scale-98 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#2481cc]/25 cursor-pointer text-sm"
          >
            <span>{mode === 'create' ? 'Create & Enter Room' : 'Join Encrypted Room'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security badges */}
        <div className="mt-6 pt-5 border-t border-[#242f3d] grid grid-cols-3 gap-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>256-bit AES</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Zero Plaintext</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Supabase Cloud</span>
          </div>
        </div>
      </div>
    </div>
  );
};
