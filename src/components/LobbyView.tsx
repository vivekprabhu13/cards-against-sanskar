import React, { useState } from 'react';
import { Player, GameSettings, CardDeck } from '../types/game';
import { DEFAULT_DECKS } from '../data/defaultDecks';
import { Copy, Check, Play, UserPlus, UserMinus, ShieldAlert, Sparkles } from 'lucide-react';

interface LobbyViewProps {
  roomCode: string;
  players: Player[];
  myPlayerId: string;
  isHost: boolean;
  settings: GameSettings;
  customDecks: CardDeck[];
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onStartGame: () => void;
  onToggleBot: (action: 'add' | 'remove') => void;
  onOpenDeckManager: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomCode,
  players,
  myPlayerId,
  isHost,
  settings,
  customDecks,
  onUpdateSettings,
  onStartGame,
  onToggleBot,
  onOpenDeckManager
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleDeck = (deckId: string) => {
    if (!isHost) return;
    const current = settings.selectedDeckIds;
    let next: string[];
    if (current.includes(deckId)) {
      if (current.length === 1) return; // keep at least 1 deck
      next = current.filter(id => id !== deckId);
    } else {
      next = [...current, deckId];
    }
    onUpdateSettings({ selectedDeckIds: next });
  };

  const canStart = players.length >= 3;
  const botCount = players.filter(p => p.isBot).length;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Room Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/60 via-stone-900 to-stone-900 border border-amber-500/30 p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sanskari Living Room (Lobby)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-stone-100 tracking-tight mt-1">
              Room Code: <span className="font-mono text-amber-300 tracking-widest">{roomCode}</span>
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Invite your cousins, aunties, and frenemies. Minimum 3 players required to start.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Players List (7 cols) */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-200">
                Connected Khandaan ({players.length})
              </h2>
              <span className="text-xs text-stone-500">
                {players.length < 3 ? `Need ${3 - players.length} more` : 'Ready to roll'}
              </span>
            </div>

            {/* Bot Controls */}
            {isHost && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggleBot('add')}
                  disabled={players.length >= 10}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium border border-stone-700 transition-colors disabled:opacity-40"
                  title="Add Bot Aunty/Uncle"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Bot</span>
                </button>
                {botCount > 0 && (
                  <button
                    onClick={() => onToggleBot('remove')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-rose-400 text-xs font-medium border border-stone-700 transition-colors"
                    title="Remove Bot"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {players.map(p => {
              const isMe = p.id === myPlayerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isMe
                      ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/20'
                      : 'bg-stone-900/60 border-stone-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-xl shrink-0">
                    {p.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-stone-200 text-sm truncate">
                        {p.name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] text-amber-400 font-bold">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400">
                      {p.isHost && (
                        <span className="text-amber-400 font-medium">👑 Host</span>
                      )}
                      {p.isBot && (
                        <span className="text-stone-400">🤖 AI Bot</span>
                      )}
                      {!p.isConnected && (
                        <span className="text-rose-400">Disconnected</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!canStart && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200/90">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Family rule:</span> Cards Against Sanskar requires at least 3 players.
                {isHost && ' Click "+ Bot" above if you want to play right now with witty AI aunties!'}
              </div>
            </div>
          )}
        </div>

        {/* Game Settings & Decks (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="rounded-2xl bg-stone-900/80 border border-stone-800 p-5 space-y-5">
            <h2 className="text-base font-bold text-stone-200 border-b border-stone-800 pb-2">
              Game Rules & Settings
            </h2>

            {/* Score to Win */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-300 font-medium">Sanskar Points to Win:</span>
                <span className="font-mono font-bold text-amber-400">{settings.maxScore} Points</span>
              </div>
              {isHost ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 5, 7, 10].map(val => (
                    <button
                      key={val}
                      onClick={() => onUpdateSettings({ maxScore: val })}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        settings.maxScore === val
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold shadow-sm'
                          : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-600'
                      }`}
                    >
                      {val} pts
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-stone-400">{settings.maxScore} points required</div>
              )}
            </div>

            {/* Round Timer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-300 font-medium">Submission Timer:</span>
                <span className="font-mono font-bold text-amber-400">
                  {settings.roundTimeoutSeconds === 0 ? 'No Limit' : `${settings.roundTimeoutSeconds}s`}
                </span>
              </div>
              {isHost ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 45, 60, 90].map(val => (
                    <button
                      key={val}
                      onClick={() => onUpdateSettings({ roundTimeoutSeconds: val })}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        settings.roundTimeoutSeconds === val
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold shadow-sm'
                          : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-600'
                      }`}
                    >
                      {val === 0 ? 'None' : `${val}s`}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-stone-400">
                  {settings.roundTimeoutSeconds === 0 ? 'Unlimited time' : `${settings.roundTimeoutSeconds} seconds per round`}
                </div>
              )}
            </div>

            {/* Decks Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-300 font-medium">Active Card Decks:</span>
                <button
                  onClick={onOpenDeckManager}
                  className="text-amber-400 hover:underline text-[11px]"
                >
                  Manage / Custom
                </button>
              </div>

              <div className="space-y-1.5">
                {DEFAULT_DECKS.map(deck => {
                  const isChecked = settings.selectedDeckIds.includes(deck.id);
                  return (
                    <button
                      key={deck.id}
                      onClick={() => handleToggleDeck(deck.id)}
                      disabled={!isHost}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left border text-xs transition-colors ${
                        isChecked
                          ? 'bg-amber-950/20 border-amber-500/40 text-stone-200'
                          : 'bg-stone-950/40 border-stone-800/80 text-stone-500'
                      } ${!isHost ? 'cursor-default' : 'hover:border-amber-400/60'}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{deck.icon}</span>
                        <span className="font-semibold truncate">{deck.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400">
                        {deck.blackCards.length + deck.whiteCards.length} cards
                      </span>
                    </button>
                  );
                })}

                {customDecks.length > 0 && (
                  <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>✨</span>
                      <span className="font-semibold">Room Custom Decks</span>
                    </div>
                    <span className="text-[10px] font-mono">
                      {customDecks.reduce((sum, d) => sum + d.blackCards.length + d.whiteCards.length, 0)} cards
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <div className="pt-2">
              {isHost ? (
                <button
                  onClick={onStartGame}
                  disabled={!canStart}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-600/20 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Cards Against Sanskar</span>
                </button>
              ) : (
                <div className="text-center py-2.5 px-4 rounded-xl bg-stone-800/60 border border-stone-700/60 text-xs text-stone-400">
                  Waiting for host ({players.find(p => p.isHost)?.name || 'Host'}) to start...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
