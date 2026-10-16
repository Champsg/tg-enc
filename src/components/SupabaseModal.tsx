import React, { useState, useEffect } from 'react';
import { Database, Check, Copy, ExternalLink, RefreshCw, X, ShieldCheck } from 'lucide-react';
import {
  SUPABASE_URL,
  SQL_SETUP_SCRIPT,
  checkSupabaseTableExists,
} from '../lib/supabase.ts';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    const exists = await checkSupabaseTableExists();
    setTableExists(exists);
    setChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-[#17212b] border border-[#2b394a] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#202b36] transition-colors"
          title="Close"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Supabase Cloud Connection
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                Connected
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md font-mono">
              {SUPABASE_URL}
            </p>
          </div>
        </div>

        {/* Status card */}
        <div className="bg-[#202b36] rounded-xl p-3.5 border border-[#2b394a] mb-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Realtime Channels & Broadcast</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <Check className="w-3.5 h-3.5" />
              Active (Global Mesh)
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#2b394a]">
            <div>
              <span className="text-slate-300 font-medium block">PostgreSQL History Storage</span>
              <span className="text-[11px] text-slate-400">
                Table: <code className="text-slate-300 font-mono">public.secret_envelopes</code>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {checking ? (
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
                </span>
              ) : tableExists ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ready
                </span>
              ) : (
                <span className="text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded text-[11px] border border-amber-800/40">
                  SQL Table Pending
                </span>
              )}

              <button
                onClick={checkStatus}
                disabled={checking}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Re-check database status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300">
              Supabase SQL Schema Script
            </span>
            <button
              onClick={handleCopySql}
              className="text-xs text-[#54a9eb] hover:text-white flex items-center gap-1 transition-colors"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL Copied!' : 'Copy SQL'}</span>
            </button>
          </div>

          <pre className="bg-[#101720] border border-[#242f3d] rounded-xl p-3 text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto leading-relaxed select-all">
            {SQL_SETUP_SCRIPT}
          </pre>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Paste into your <strong>Supabase Dashboard &gt; SQL Editor</strong> to enable permanent cloud history for your encrypted messages.
          </p>
        </div>

        {/* Security guarantee */}
        <div className="bg-[#182533] rounded-xl p-3 border border-[#242f3d] flex items-start gap-2.5 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300 leading-relaxed">
            <strong>Zero-Knowledge Protection:</strong> Even when stored in Supabase, all messages and media remain AES-256-GCM encrypted. Nobody with access to Supabase can read your chats.
          </p>
        </div>
      </div>
    </div>
  );
};
