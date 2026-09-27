import React, { useState } from 'react';
import { X, Server, Check, Globe, Laptop, HelpCircle } from 'lucide-react';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStandaloneMode: boolean;
  isConnected: boolean;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
  isStandaloneMode,
  isConnected
}) => {
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem('sanskar_backend_url') || (import.meta as any).env?.VITE_BACKEND_URL || '';
  });
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (backendUrl.trim()) {
      localStorage.setItem('sanskar_backend_url', backendUrl.trim());
    } else {
      localStorage.removeItem('sanskar_backend_url');
    }
    setSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl space-y-5 text-stone-200">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-stone-100">
              Server & Deployment Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Mode Badge */}
        <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-2">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Current Game Engine
          </div>
          <div className="flex items-center gap-2.5">
            {isStandaloneMode ? (
              <>
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-100">
                    Standalone / Netlify Engine
                  </div>
                  <div className="text-xs text-amber-400/90">
                    Runs directly in browser • Bot Aunties enabled • Multi-tab synced
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-100">
                    Full-Stack Real-Time Server
                  </div>
                  <div className="text-xs text-emerald-400">
                    WebSocket + HTTP Backend connected • Global multiplayer ready
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Custom Backend URL */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center justify-between">
            <span>Remote Backend Server URL</span>
            <span className="text-[10px] text-stone-400 lowercase font-normal">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. https://my-sanskar-backend.up.railway.app"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-400 focus:outline-none text-xs text-stone-200 placeholder-stone-600 font-mono"
          />
          <p className="text-[11px] text-stone-400 leading-relaxed">
            When deploying on static hosts like Netlify, the client engine works automatically. To invite friends across different phones and laptops, enter a hosted backend URL (Railway, Render, Fly.io) or set <code className="text-amber-300">VITE_BACKEND_URL</code> in your Netlify Environment Variables.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-xs font-semibold"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{saved ? 'Saved (Reloading...)' : 'Save & Connect'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
