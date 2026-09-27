/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { LobbyView } from './components/LobbyView';
import { GameTable } from './components/GameTable';
import { ChatAndReactions } from './components/ChatAndReactions';
import { DeckManagerModal } from './components/DeckManagerModal';
import { RulesModal } from './components/RulesModal';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { AlertCircle, X } from 'lucide-react';

export default function App() {
  const {
    isConnected,
    isStandaloneMode,
    roomState,
    myPlayerId,
    errorMessage,
    floatingReactions,
    createRoom,
    joinRoom,
    leaveRoom,
    updateSettings,
    startGame,
    submitCards,
    revealSubmission,
    selectWinner,
    nextRound,
    restartGame,
    sacrificeSanskar,
    addCustomCard,
    toggleBot,
    sendChat,
    sendReaction,
    clearError
  } = useGameSocket();

  // Modals state
  const [isDeckManagerOpen, setIsDeckManagerOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);

  // Check URL query parameters for ?room=XYZ
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase());
    }
  }, []);

  const me = roomState?.players.find(p => p.id === myPlayerId);
  const isHost = me?.isHost || false;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        roomCode={roomState?.code}
        playerCount={roomState?.players.length}
        onOpenDeckManager={() => setIsDeckManagerOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenServerSettings={() => setIsServerSettingsOpen(true)}
        onLeaveRoom={roomState ? leaveRoom : undefined}
        isConnected={isConnected}
        isStandaloneMode={isStandaloneMode}
      />

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={clearError} className="p-0.5 hover:opacity-80 ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {!roomState ? (
          <HomeView
            onCreateRoom={(name, avatar, customCode) => createRoom(name, avatar, customCode)}
            onJoinRoom={(code, name, avatar) => joinRoom(code, name, avatar)}
            onOpenDeckManager={() => setIsDeckManagerOpen(true)}
            onOpenRules={() => setIsRulesOpen(true)}
            initialRoomCode={initialRoomCode}
          />
        ) : roomState.phase === 'lobby' ? (
          <LobbyView
            roomCode={roomState.code}
            players={roomState.players}
            myPlayerId={myPlayerId}
            isHost={isHost}
            settings={roomState.settings}
            customDecks={roomState.customDecks}
            onUpdateSettings={updateSettings}
            onStartGame={startGame}
            onToggleBot={toggleBot}
            onOpenDeckManager={() => setIsDeckManagerOpen(true)}
          />
        ) : (
          <GameTable
            roomState={roomState}
            myPlayerId={myPlayerId}
            isHost={isHost}
            onSubmitCards={submitCards}
            onRevealSubmission={revealSubmission}
            onSelectWinner={selectWinner}
            onNextRound={nextRound}
            onRestartGame={restartGame}
            onSacrificeSanskar={sacrificeSanskar}
          />
        )}
      </main>

      {/* In-Game Floating Reactions & Real-time Chat Drawer */}
      {roomState && (
        <ChatAndReactions
          chatMessages={roomState.chatMessages}
          floatingReactions={floatingReactions}
          onSendChat={sendChat}
          onSendReaction={sendReaction}
          myPlayerId={myPlayerId}
        />
      )}

      {/* Deck Manager Modal */}
      <DeckManagerModal
        isOpen={isDeckManagerOpen}
        onClose={() => setIsDeckManagerOpen(false)}
        customDecks={roomState?.customDecks || []}
        onAddCustomCard={roomState ? addCustomCard : undefined}
        isHost={isHost}
      />

      {/* Game Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Server & Deployment Settings Modal */}
      <ServerSettingsModal
        isOpen={isServerSettingsOpen}
        onClose={() => setIsServerSettingsOpen(false)}
        isStandaloneMode={isStandaloneMode}
        isConnected={isConnected}
      />
    </div>
  );
}
