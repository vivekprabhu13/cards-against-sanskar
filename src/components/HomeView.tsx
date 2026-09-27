import React, { useState, useEffect } from 'react';
import { DESI_AVATARS } from '../data/defaultDecks';
import { Sparkles, ArrowRight, Bot, Users, Layers, ShieldCheck } from 'lucide-react';

interface HomeViewProps {
  onCreateRoom: (name: string, avatar: string, customCode?: string) => void;
  onJoinRoom: (roomCode: string, name: string, avatar: string) => void;
  onOpenDeckManager: () => void;
  onOpenRules: () => void;
  initialRoomCode?: string;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onCreateRoom,
  onJoinRoom,
  onOpenDeckManager,
  onOpenRules,
  initialRoomCode = ''
}) => {
  const [name, setName] = useState(() => localStorage.getItem('sanskar_player_name') || '');
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('sanskar_player_avatar') || DESI_AVATARS[0].icon);
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [customRoomCode, setCustomRoomCode] = useState('');

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase());
      setActiveTab('join');
    }
  }, [initialRoomCode]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Sanskari Guest';
    onCreateRoom(finalName, selectedAvatar, customRoomCode.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    const finalName = name.trim() || 'Sanskari Guest';
    onJoinRoom(roomCode.trim().toUpperCase(), finalName, selectedAvatar);
  };

  const handleQuickPlayWithBots = () => {
    const finalName = name.trim() || 'Desi Rebel';
    // Create room, then will add bots
    onCreateRoom(finalName, selectedAvatar);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-time Multiplayer Desi Card Game</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-stone-100">
          Cards Against <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">Sanskar</span>
        </h1>

        <p className="text-stone-300 text-sm sm:text-base max-w-xl mx-auto font-light leading-relaxed">
          The party game for terrible people who still touch their elders' feet for cash envelopes.
          Featuring Aunties, Rishtas, astrologers, flying chappals, and <em>Log Kya Kahenge</em>.
        </p>
      </div>

      {/* Main Action Card */}
      <div className="max-w-md mx-auto bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 backdrop-blur-md">
        {/* Step 1: Choose Identity */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block">
            1. Your Sanskari Name & Avatar
          </label>
          <input
            type="text"
            placeholder="e.g., Sharma Ji's Favorite, Chintu, Rebel Beti"
            value={name}
            maxLength={24}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:border-amber-500 font-medium"
          />

          {/* Avatar selector */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] text-stone-400">Choose your Khandaan persona:</span>
            <div className="grid grid-cols-5 gap-2">
              {DESI_AVATARS.map(avatar => {
                const isSelected = selectedAvatar === avatar.icon;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.icon)}
                    className={`h-11 rounded-xl flex items-center justify-center text-xl transition-all border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 scale-105 shadow-md'
                        : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                    }`}
                    title={`${avatar.name} (${avatar.title})`}
                  >
                    {avatar.icon}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 2: Tab Switcher (Create vs Join) */}
        <div className="space-y-4 pt-1 border-t border-stone-800">
          <div className="grid grid-cols-2 p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-2 rounded-lg font-bold transition-colors ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Create New Room
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`py-2 rounded-lg font-bold transition-colors ${
                activeTab === 'join'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Join Existing Room
            </button>
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400 flex items-center justify-between">
                  <span>Custom Room Code (Optional):</span>
                  <span className="text-[10px] text-stone-500">e.g. SANSK</span>
                </label>
                <input
                  type="text"
                  placeholder="Leave blank for auto-code"
                  maxLength={6}
                  value={customRoomCode}
                  onChange={e => setCustomRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 text-xs font-mono uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>Create Sanskari Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-stone-400">
                  Enter 5-Letter Room Code:
                </label>
                <input
                  type="text"
                  placeholder="e.g., AUNTY"
                  maxLength={6}
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 text-sm font-mono tracking-widest text-center uppercase focus:outline-none focus:border-amber-500 font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!roomCode.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <span>Enter Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Quick Play CTA */}
        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onOpenDeckManager}
            className="flex items-center gap-1.5 text-stone-400 hover:text-amber-400 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Explore 200+ Cards</span>
          </button>
          <button
            type="button"
            onClick={onOpenRules}
            className="text-stone-400 hover:text-amber-400 transition-colors"
          >
            How to Play
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800/80 space-y-1.5 text-center">
          <div className="text-2xl mb-1">⚡</div>
          <h3 className="font-bold text-stone-200 text-sm">Real-Time WebSockets</h3>
          <p className="text-xs text-stone-400">
            Instant card submissions, live judging reveals, and hilarious Desi emoji reactions.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800/80 space-y-1.5 text-center">
          <div className="text-2xl mb-1">🥿</div>
          <h3 className="font-bold text-stone-200 text-sm">5 Curated Sanskar Decks</h3>
          <p className="text-xs text-stone-400">
            Khandaan drama, 90s Bollywood tropes, NRI cringe, Tech Bro Sharma Ji, and Spicy 18+.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800/80 space-y-1.5 text-center">
          <div className="text-2xl mb-1">✨</div>
          <h3 className="font-bold text-stone-200 text-sm">Dynamic Custom Decks</h3>
          <p className="text-xs text-stone-400">
            Add inside jokes and custom cards live during games, or export & share your decks.
          </p>
        </div>
      </div>
    </div>
  );
};
