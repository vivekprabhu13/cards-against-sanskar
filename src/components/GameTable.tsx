import React, { useState, useEffect } from 'react';
import { RoomState } from '../types/game';
import { BlackCardView, WhiteCardView } from './CardView';
import { Clock, Trophy, Crown, RotateCcw, ArrowRight, Eye, Sparkles, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';

interface GameTableProps {
  roomState: RoomState;
  myPlayerId: string;
  isHost: boolean;
  onSubmitCards: (cardIds: string[]) => void;
  onRevealSubmission: (index: number) => void;
  onSelectWinner: (winnerPlayerId?: string, submissionIndex?: number) => void;
  onNextRound: () => void;
  onRestartGame: () => void;
  onSacrificeSanskar: (cardIds: string[]) => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  roomState,
  myPlayerId,
  isHost,
  onSubmitCards,
  onRevealSubmission,
  onSelectWinner,
  onNextRound,
  onRestartGame,
  onSacrificeSanskar
}) => {
  const {
    currentBlackCard,
    currentJudgeId,
    phase,
    roundNumber,
    roundTimeRemaining,
    submissions,
    lastWinner,
    players,
    hasSubmittedMap
  } = roomState;

  const me = players.find(p => p.id === myPlayerId);
  const isJudge = currentJudgeId === myPlayerId;
  const currentJudge = players.find(p => p.id === currentJudgeId);

  // Card selection state
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [discardSelection, setDiscardSelection] = useState<string[]>([]);
  const [discardMode, setDiscardMode] = useState(false);

  // Clear selection on new round
  useEffect(() => {
    setSelectedCardIds([]);
    setDiscardSelection([]);
    setDiscardMode(false);
  }, [roundNumber, phase]);

  const requiredPick = currentBlackCard?.pick || 1;
  const hasSubmitted = hasSubmittedMap[myPlayerId];
  const mySubmission = submissions.find(s => s.playerId === myPlayerId);

  const handleCardClick = (cardId: string) => {
    if (isJudge || hasSubmitted || phase !== 'submitting') return;

    if (discardMode) {
      if (discardSelection.includes(cardId)) {
        setDiscardSelection(prev => prev.filter(id => id !== cardId));
      } else if (discardSelection.length < 3) {
        setDiscardSelection(prev => [...prev, cardId]);
      }
      return;
    }

    if (requiredPick === 1) {
      setSelectedCardIds([cardId]);
    } else {
      // Pick 2
      if (selectedCardIds.includes(cardId)) {
        setSelectedCardIds(prev => prev.filter(id => id !== cardId));
      } else if (selectedCardIds.length < requiredPick) {
        setSelectedCardIds(prev => [...prev, cardId]);
      }
    }
  };

  const handleSubmit = () => {
    if (selectedCardIds.length === requiredPick) {
      onSubmitCards(selectedCardIds);
    }
  };

  const handleExecuteSacrifice = () => {
    if (discardSelection.length > 0) {
      onSacrificeSanskar(discardSelection);
      setDiscardMode(false);
      setDiscardSelection([]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-6">
      {/* Top Game Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/80 border border-stone-800 rounded-2xl p-3 px-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-sm text-stone-200">
            <span className="text-amber-400">Round {roundNumber}</span>
            <span className="text-stone-600">/</span>
            <span className="text-xs text-stone-400 font-normal">First to {roomState.settings.maxScore} pts</span>
          </div>

          <div className="h-4 w-px bg-stone-700 hidden sm:block" />

          {/* Current Judge Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Judge:</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-600/30 text-amber-300 text-xs font-semibold">
              <span>{currentJudge?.avatar || '🥿'}</span>
              <span>{isJudge ? 'You (Sanskari Czar)' : currentJudge?.name || 'Pandit Ji'}</span>
            </div>
          </div>
        </div>

        {/* Status / Timer */}
        <div className="flex items-center gap-3">
          {roundTimeRemaining !== null && phase === 'submitting' && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${
              roundTimeRemaining <= 15
                ? 'bg-rose-950/40 border-rose-600/40 text-rose-400 animate-pulse'
                : 'bg-stone-800 border-stone-700 text-stone-300'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{roundTimeRemaining}s</span>
            </div>
          )}

          {/* Submissions Count Indicator */}
          <div className="text-xs text-stone-400 flex items-center gap-1">
            <span>Submissions:</span>
            <span className="font-bold text-stone-200">
              {submissions.length} / {players.filter(p => p.id !== currentJudgeId && p.isConnected).length}
            </span>
          </div>
        </div>
      </div>

      {/* Players Progress Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        {players.map(p => {
          const isCurrentJudge = p.id === currentJudgeId;
          const hasSubmittedCard = hasSubmittedMap[p.id];

          return (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shrink-0 transition-all ${
                isCurrentJudge
                  ? 'bg-amber-950/30 border-amber-500/50 text-amber-300 font-semibold'
                  : hasSubmittedCard
                  ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-300'
                  : 'bg-stone-900/60 border-stone-800 text-stone-400'
              }`}
            >
              <span>{p.avatar}</span>
              <span className="truncate max-w-[90px]">{p.name}</span>
              <span className="font-mono font-bold ml-1 text-amber-400">
                ★{p.score}
              </span>
              {isCurrentJudge && (
                <span className="text-[10px] text-amber-300">👑 Judge</span>
              )}
              {!isCurrentJudge && phase === 'submitting' && (
                <span className="text-[10px]">
                  {hasSubmittedCard ? '✓' : '...'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Table Felt */}
      <div className="relative rounded-3xl bg-gradient-to-b from-stone-900/90 to-stone-950 border border-stone-800/80 p-4 sm:p-8 min-h-[380px] flex flex-col justify-between shadow-2xl overflow-hidden">
        {/* Decorative backdrop elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

        {/* Phase: ROUND WINNER OVERLAY */}
        {phase === 'round_winner' && lastWinner && (
          <div className="relative z-20 my-auto py-6 space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-bold shadow-md">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Round {roundNumber} Winner!</span>
            </div>

            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-stone-100 flex items-center justify-center gap-2">
                <span>{lastWinner.winnerAvatar}</span>
                <span>{lastWinner.winnerName}</span>
                <span className="text-amber-400">+1 pt</span>
              </div>
              <p className="text-sm text-stone-400 italic font-serif max-w-lg mx-auto">
                "{lastWinner.commentary}"
              </p>
            </div>

            {/* Winning Combo Display */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-2xl mx-auto pt-2">
              <BlackCardView card={lastWinner.blackCard} size="normal" />
              <div className="text-amber-400 text-xl font-bold font-mono">➔</div>
              <div className="space-y-2">
                {lastWinner.winningCards.map(c => (
                  <WhiteCardView key={c.id} card={c} size="normal" />
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button
                onClick={onNextRound}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <span>Next Round</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Phase: GAME OVER SCREEN */}
        {phase === 'game_over' && (
          <div className="relative z-20 my-auto py-8 text-center space-y-6 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mx-auto text-3xl shadow-xl">
              👑
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-100 tracking-tight">
                Game Over!
              </h2>
              <p className="text-sm text-amber-300 font-semibold mt-1">
                The Khandaan has spoken!
              </p>
            </div>

            {/* Leaderboard Podium */}
            <div className="max-w-md mx-auto rounded-2xl bg-stone-900 border border-stone-800 p-4 space-y-2.5">
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      idx === 0
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                        : 'bg-stone-950/40 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-sm text-stone-400 w-4">
                        {idx + 1}
                      </span>
                      <span className="text-xl">{p.avatar}</span>
                      <span className="font-semibold text-sm truncate max-w-[140px]">
                        {p.name}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                          Sanskar Supreme
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-amber-400">
                      {p.score} pts
                    </span>
                  </div>
                ))}
            </div>

            {isHost && (
              <div className="pt-3">
                <button
                  onClick={onRestartGame}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm tracking-wide shadow-lg mx-auto transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Another Match</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase: SUBMITTING & JUDGING */}
        {phase !== 'round_winner' && phase !== 'game_over' && (
          <div className="space-y-6">
            {/* Center Area: Black Prompt + Submissions Table */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6">
              {/* The Black Prompt Card */}
              {currentBlackCard && (
                <div className="shrink-0 flex flex-col items-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-2">
                    Current Sanskar Prompt
                  </div>
                  <BlackCardView card={currentBlackCard} size="large" />
                </div>
              )}

              {/* Submissions Area */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    {phase === 'judging'
                      ? 'Submissions for the Judge to Review'
                      : `Submissions on Table (${submissions.length}/${players.filter(p => p.id !== currentJudgeId && p.isConnected).length})`}
                  </div>
                  {phase === 'judging' && isJudge && (
                    <div className="text-xs text-amber-300 font-medium animate-pulse">
                      Tap cards to reveal them, then select your favorite!
                    </div>
                  )}
                  {phase === 'submitting' && hasSubmitted && (
                    <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Your card is in!</span>
                    </div>
                  )}
                </div>

                {/* Submissions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-h-[190px] p-3 rounded-2xl bg-stone-950/40 border border-stone-800/80">
                  {submissions.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center p-8 text-center text-stone-500 space-y-2">
                      <Sparkles className="w-6 h-6 text-stone-600" />
                      <p className="text-xs">
                        {isJudge
                          ? 'Waiting for players to submit their hilarious cards...'
                          : hasSubmitted
                          ? 'Your card is in! Waiting for the rest of the Khandaan...'
                          : `Pick ${requiredPick} card${requiredPick > 1 ? 's' : ''} from your hand below to submit.`}
                      </p>
                    </div>
                  ) : (
                    submissions.map((sub, sIdx) => {
                      const isRevealed = sub.revealed;
                      const isMySubmission = sub.playerId === myPlayerId;

                      if (!isRevealed && !isMySubmission) {
                        return (
                          <div
                            key={sIdx}
                            onClick={() => {
                              if (phase === 'judging' && isJudge) {
                                onRevealSubmission(sIdx);
                              }
                            }}
                            className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 select-none min-h-[170px] transition-all ${
                              phase === 'judging' && isJudge
                                ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400 hover:scale-102 cursor-pointer shadow-lg'
                                : 'bg-stone-900/60 border-stone-800'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-xl bg-stone-800/80 border border-stone-700 flex items-center justify-center text-2xl shadow-inner">
                              🥿
                            </div>
                            <span className="font-semibold text-xs text-stone-300">
                              {phase === 'judging' && isJudge
                                ? 'Click to Reveal'
                                : 'Mystery Sanskar'}
                            </span>
                            {phase === 'judging' && isJudge && (
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                        );
                      }

                      // Revealed or player's own submission
                      return (
                        <div
                          key={sIdx}
                          className={`flex flex-col gap-2 p-2.5 rounded-xl border shadow-lg relative group ${
                            isMySubmission
                              ? 'bg-amber-950/25 border-amber-500/60 ring-1 ring-amber-500/30'
                              : 'bg-stone-900/90 border-stone-700/80'
                          }`}
                        >
                          {isMySubmission && (
                            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 px-1">
                              <CheckCircle2 className="w-3 h-3 text-amber-400" />
                              <span>Your Submission</span>
                            </div>
                          )}

                          <div className="flex-1 space-y-1.5">
                            {sub.cards.map((c, cIdx) => (
                              <WhiteCardView
                                key={c.id || cIdx}
                                card={c}
                                size="compact"
                              />
                            ))}
                          </div>

                          {/* Judge Winner Selection Button */}
                          {phase === 'judging' && isJudge && (
                            <button
                              onClick={() => onSelectWinner(sub.playerId, sIdx)}
                              className="w-full mt-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs tracking-wide shadow-md transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>Crown this Answer!</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player's Hand Tray (ALWAYS VISIBLE so cards never vanish!) */}
      <div className="space-y-3 pt-2 border-t border-stone-800/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-200">
              Your Sanskari Hand ({me?.hand?.length || 0} cards)
            </span>

            {/* Status indicator */}
            {isJudge ? (
              <span className="text-xs text-amber-400 font-medium">
                👑 You are the Sanskar Judge this round!
              </span>
            ) : phase === 'submitting' ? (
              <span className="text-xs text-amber-400 font-medium">
                {hasSubmitted
                  ? '✓ Card Submitted! Waiting for other players...'
                  : discardMode
                  ? `Select up to 3 cards to discard (${discardSelection.length}/3)`
                  : `Select ${requiredPick} card${requiredPick > 1 ? 's' : ''} (${selectedCardIds.length}/${requiredPick})`}
              </span>
            ) : phase === 'judging' ? (
              <span className="text-xs text-stone-400">
                Judging in progress. Your hand is ready for next round.
              </span>
            ) : (
              <span className="text-xs text-stone-400">
                Round over. Ready for next hand!
              </span>
            )}
          </div>

          {/* Interactive controls only for non-judge during submitting */}
          {!isJudge && phase === 'submitting' && (
            <div className="flex items-center gap-2">
              {/* Sacrifice Sanskar Discard action */}
              {!hasSubmitted && (me?.sanskarSacrificesLeft ?? 0) > 0 && (
                <button
                  onClick={() => {
                    setDiscardMode(!discardMode);
                    setSelectedCardIds([]);
                    setDiscardSelection([]);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    discardMode
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                      : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
                  }`}
                  title="Discard up to 3 unhelpful cards and redraw new ones (1 use per game)"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>{discardMode ? 'Cancel Redraw' : 'Sacrifice Sanskar (Redraw)'}</span>
                </button>
              )}

              {/* Submit / Execute Redraw Button */}
              {discardMode ? (
                <button
                  onClick={handleExecuteSacrifice}
                  disabled={discardSelection.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Discard & Draw {discardSelection.length}</span>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={hasSubmitted || selectedCardIds.length !== requiredPick}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs tracking-wide shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{hasSubmitted ? 'Card Submitted ✓' : 'Submit Card'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cards Tray Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {me?.hand && me.hand.length > 0 ? (
            me.hand.map(card => {
              const isSelected = discardMode
                ? discardSelection.includes(card.id)
                : selectedCardIds.includes(card.id);
              const orderIndex = selectedCardIds.indexOf(card.id);
              const isInteractable = !isJudge && phase === 'submitting' && !hasSubmitted;

              return (
                <WhiteCardView
                  key={card.id}
                  card={card}
                  isSelected={isSelected}
                  selectionOrder={orderIndex !== -1 ? orderIndex + 1 : undefined}
                  onClick={isInteractable ? () => handleCardClick(card.id) : undefined}
                  disabled={!isInteractable}
                  size="normal"
                />
              );
            })
          ) : (
            <div className="col-span-full p-4 rounded-xl bg-stone-900 border border-stone-800 text-center text-xs text-stone-400">
              Dealing cards from the sacred deck...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
