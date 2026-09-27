import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, BookOpen, Layers, LogOut, Users } from 'lucide-react';
import { toggleSound, isSoundEnabled } from '../utils/audio';

interface NavbarProps {
  roomCode?: string;
  playerCount?: number;
  onOpenDeckManager: () => void;
  onOpenRules: () => void;
  onLeaveRoom?: () => void;
  isConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomCode,
  playerCount = 0,
  onOpenDeckManager,
  onOpenRules,
  onLeaveRoom,
  isConnected
}) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [copied, setCopied] = useState(false);

  const handleToggleSound = () => {
    const nextState = toggleSound();
    setSoundOn(nextState);
  };

  const handleCopyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-950/85 backdrop-blur-md border-b border-amber-950/50 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Slipper">🥿</span>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-stone-100 tracking-tight text-base md:text-lg">
                  Cards Against
                </span>
                <span className="font-extrabold bg-gradient-to-r from-amber-400 via-amber-200 to-orange-400 bg-clip-text text-transparent text-base md:text-lg tracking-tight">
                  Sanskar
                </span>
                <span className="hidden sm:inline text-xs font-serif text-amber-500/70 ml-1">
                  (संस्कार)
                </span>
              </div>
              <p className="text-[10px] text-stone-400 hidden md:block">
                The Unfiltered Desi Multiplayer Party Game
              </p>
            </div>
          </div>
        </div>

        {/* Center: Room Code pill if inside room */}
        {roomCode && (
          <div className="flex items-center gap-2 bg-stone-900/90 border border-amber-500/30 rounded-lg px-2.5 py-1 text-xs">
            <div className="flex items-center gap-1.5 text-stone-400">
              <span className="text-[11px] font-medium text-stone-400">ROOM:</span>
              <span className="font-mono font-bold text-amber-300 tracking-wider text-sm">
                {roomCode}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              title="Copy Invite Link"
              className="p-1 rounded text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <div className="h-3.5 w-px bg-stone-800 mx-0.5" />
            <div className="flex items-center gap-1 text-stone-400 text-xs">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>{playerCount}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Connection status indicator */}
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 animate-ping'
            }`}
            title={isConnected ? 'Connected to WebSocket server' : 'Reconnecting...'}
          />

          <button
            onClick={onOpenDeckManager}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-300 hover:text-amber-300 hover:bg-stone-800 border border-stone-800 transition-colors"
            title="Manage Decks & Custom Cards"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Decks</span>
          </button>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-300 hover:text-amber-300 hover:bg-stone-800 border border-stone-800 transition-colors"
            title="Game Rules"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="p-2 rounded-lg text-stone-300 hover:text-amber-300 hover:bg-stone-800 border border-stone-800 transition-colors"
            title={soundOn ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-stone-500" />}
          </button>

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="p-2 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 border border-stone-800 transition-colors"
              title="Leave Room"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
