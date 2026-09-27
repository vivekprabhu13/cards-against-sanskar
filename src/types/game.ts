export interface BlackCard {
  id: string;
  text: string;
  pick: 1 | 2;
  deckId: string;
  category?: string;
  author?: string;
}

export interface WhiteCard {
  id: string;
  text: string;
  deckId: string;
  category?: string;
  author?: string;
}

export interface CardDeck {
  id: string;
  name: string;
  icon: string;
  description: string;
  blackCards: BlackCard[];
  whiteCards: WhiteCard[];
  isCustom?: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  isConnected: boolean;
  isBot?: boolean;
  hand: WhiteCard[];
  sanskarSacrificesLeft: number;
  lastActive?: number;
}

export interface Submission {
  playerId: string;
  playerName: string;
  cards: WhiteCard[];
  revealed: boolean;
}

export type GamePhase =
  | 'lobby'
  | 'submitting'
  | 'judging'
  | 'round_winner'
  | 'game_over';

export interface GameSettings {
  maxScore: number;
  roundTimeoutSeconds: number; // 0 = unlimited
  selectedDeckIds: string[];
  allowCustomCards: boolean;
  botCount: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface LiveReaction {
  id: string;
  emoji: string;
  senderName: string;
  timestamp: number;
  x?: number; // percent across screen for floating animations
}

export interface WinnerCelebration {
  winnerId: string;
  winnerName: string;
  winnerAvatar: string;
  winningCards: WhiteCard[];
  blackCard: BlackCard;
  judgeName: string;
  commentary: string;
}

export interface RoomState {
  code: string;
  hostId: string;
  phase: GamePhase;
  currentJudgeId: string;
  currentBlackCard: BlackCard | null;
  roundNumber: number;
  roundTimeRemaining: number | null;
  submissions: Submission[];
  hasSubmittedMap: Record<string, boolean>; // playerId -> true if submitted
  lastWinner: WinnerCelebration | null;
  players: Player[];
  settings: GameSettings;
  deckStats: {
    blackRemaining: number;
    whiteRemaining: number;
    totalDecks: number;
  };
  customDecks: CardDeck[];
  chatMessages: ChatMessage[];
  liveReactions: LiveReaction[];
}

export type ClientMessage =
  | { type: 'CREATE_ROOM'; payload: { playerName: string; avatar: string; roomCode?: string } }
  | { type: 'JOIN_ROOM'; payload: { roomCode: string; playerName: string; avatar: string; playerId?: string } }
  | { type: 'LEAVE_ROOM' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<GameSettings> }
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_CARDS'; payload: { cardIds: string[] } }
  | { type: 'REVEAL_SUBMISSION'; payload: { submissionIndex: number } }
  | { type: 'SELECT_WINNER'; payload: { winnerPlayerId?: string; submissionIndex?: number } }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESTART_GAME' }
  | { type: 'SACRIFICE_SANSKAR'; payload: { cardIdsToDiscard: string[] } }
  | { type: 'ADD_CUSTOM_CARD'; payload: { deckId?: string; isBlack: boolean; text: string; pick?: 1 | 2 } }
  | { type: 'TOGGLE_BOT'; payload: { action: 'add' | 'remove'; botName?: string; avatar?: string } }
  | { type: 'SEND_CHAT'; payload: { text: string } }
  | { type: 'SEND_REACTION'; payload: { emoji: string } }
  | { type: 'PING' };

export type ServerMessage =
  | { type: 'ROOM_STATE'; payload: RoomState; yourPlayerId: string }
  | { type: 'ERROR'; payload: { message: string } }
  | { type: 'REACTION'; payload: LiveReaction }
  | { type: 'PONG' };
