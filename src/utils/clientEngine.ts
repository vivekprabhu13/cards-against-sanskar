import {
  BlackCard,
  WhiteCard,
  CardDeck,
  Player,
  Submission,
  GamePhase,
  GameSettings,
  ChatMessage,
  LiveReaction,
  WinnerCelebration,
  RoomState,
  ClientMessage
} from '../types/game';
import { DEFAULT_DECKS, WIN_COMMENTARIES, DESI_AVATARS } from '../data/defaultDecks';

interface LocalRoom {
  code: string;
  hostId: string;
  phase: GamePhase;
  currentJudgeId: string;
  currentBlackCard: BlackCard | null;
  roundNumber: number;
  roundTimeRemaining: number | null;
  timerInterval: any;
  submissions: Submission[];
  lastWinner: WinnerCelebration | null;
  players: Player[];
  settings: GameSettings;
  customDecks: CardDeck[];
  blackDeck: BlackCard[];
  blackDiscard: BlackCard[];
  whiteDeck: WhiteCard[];
  whiteDiscard: WhiteCard[];
  chatMessages: ChatMessage[];
  liveReactions: LiveReaction[];
}

export class ClientGameEngine {
  private rooms = new Map<string, LocalRoom>();
  private channel: BroadcastChannel | null = null;
  private onStateChangeCallbacks = new Set<(roomState: RoomState, forPlayerId: string) => void>();
  private onReactionCallbacks = new Set<(reaction: LiveReaction) => void>();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('cards_against_sanskar_channel');
        this.channel.onmessage = (event) => {
          const { type, payload, roomCode, fromPlayerId } = event.data || {};
          if (type === 'SYNC_ROOM' && payload) {
            this.handleRemoteRoomSync(payload);
          } else if (type === 'ACTION' && roomCode && payload) {
            this.processAction(roomCode, fromPlayerId, payload, false);
          } else if (type === 'REACTION' && payload) {
            this.onReactionCallbacks.forEach(cb => cb(payload));
          }
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }
  }

  public subscribe(cb: (roomState: RoomState, forPlayerId: string) => void) {
    this.onStateChangeCallbacks.add(cb);
    return () => {
      this.onStateChangeCallbacks.delete(cb);
    };
  }

  public onReaction(cb: (reaction: LiveReaction) => void) {
    this.onReactionCallbacks.add(cb);
    return () => {
      this.onReactionCallbacks.delete(cb);
    };
  }

  private notify(room: LocalRoom) {
    // Notify all local subscribers
    for (const player of room.players) {
      const sanitized = this.sanitizeRoomStateForPlayer(room, player.id);
      this.onStateChangeCallbacks.forEach(cb => cb(sanitized, player.id));
    }

    // Broadcast state to other tabs
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'SYNC_ROOM',
          payload: {
            ...room,
            timerInterval: null // non-cloneable
          }
        });
      } catch {
        // Ignored
      }
    }
  }

  private handleRemoteRoomSync(remoteRoom: LocalRoom) {
    const existing = this.rooms.get(remoteRoom.code);
    const room: LocalRoom = {
      ...remoteRoom,
      timerInterval: existing?.timerInterval || null
    };
    this.rooms.set(room.code, room);

    for (const player of room.players) {
      const sanitized = this.sanitizeRoomStateForPlayer(room, player.id);
      this.onStateChangeCallbacks.forEach(cb => cb(sanitized, player.id));
    }
  }

  private generateRoomCode(): string {
    const DESI_CODES = ['SANSK', 'SHRMA', 'RISHT', 'DOSHA', 'AUNTY', 'KUNDL', 'CHAIW', 'BURRA', 'PAPDI', 'KOTA'];
    for (const code of DESI_CODES) {
      if (!this.rooms.has(code)) return code;
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  public getRoomState(roomCode: string, playerId: string): RoomState | null {
    const room = this.rooms.get(roomCode.toUpperCase().trim());
    if (!room) return null;
    return this.sanitizeRoomStateForPlayer(room, playerId);
  }

  public createRoom(playerName: string, avatar: string, requestedCode?: string): { roomState: RoomState; playerId: string; roomCode: string } {
    let code = (requestedCode || '').toUpperCase().trim();
    if (!code || code.length < 3 || this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    const hostPlayer: Player = {
      id: playerId,
      name: (playerName || 'Player 1').trim().substring(0, 24),
      avatar: avatar || DESI_AVATARS[0].icon,
      isHost: true,
      isReady: true,
      score: 0,
      isConnected: true,
      hand: [],
      sanskarSacrificesLeft: 1
    };

    const room: LocalRoom = {
      code,
      hostId: playerId,
      phase: 'lobby',
      currentJudgeId: '',
      currentBlackCard: null,
      roundNumber: 0,
      roundTimeRemaining: null,
      timerInterval: null,
      submissions: [],
      lastWinner: null,
      players: [hostPlayer],
      settings: {
        maxScore: 5,
        roundTimeoutSeconds: 60,
        selectedDeckIds: ['khandaan', 'bollywood', 'nri', 'tech'],
        allowCustomCards: true,
        botCount: 0
      },
      customDecks: [],
      blackDeck: [],
      blackDiscard: [],
      whiteDeck: [],
      whiteDiscard: [],
      chatMessages: [],
      liveReactions: []
    };

    this.rooms.set(code, room);
    this.addSystemMessage(room, `Swagatam! Room ${code} created by ${hostPlayer.name} (Client / Netlify Standalone Mode).`);
    this.notify(room);
    const sanitized = this.sanitizeRoomStateForPlayer(room, playerId);
    return { roomState: sanitized, playerId, roomCode: code };
  }

  public joinRoom(roomCode: string, playerName: string, avatar: string, existingPlayerId?: string): { success: boolean; roomState?: RoomState; playerId?: string; error?: string } {
    const code = (roomCode || '').toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: `Room "${code}" not found in current browser session.` };
    }

    let player: Player | undefined;
    if (existingPlayerId) {
      player = room.players.find(p => p.id === existingPlayerId);
    }

    if (player) {
      player.isConnected = true;
      if (playerName) player.name = playerName.trim().substring(0, 24);
      if (avatar) player.avatar = avatar;
      this.addSystemMessage(room, `${player.name} returned to the room.`);
    } else {
      const newPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);
      player = {
        id: newPlayerId,
        name: (playerName || 'Sanskari Guest').trim().substring(0, 24),
        avatar: avatar || DESI_AVATARS[Math.floor(Math.random() * DESI_AVATARS.length)].icon,
        isHost: room.players.length === 0,
        isReady: room.phase !== 'lobby',
        score: 0,
        isConnected: true,
        hand: [],
        sanskarSacrificesLeft: 1
      };

      if (room.phase !== 'lobby') {
        this.dealCardsToPlayer(room, player, 7);
      }

      room.players.push(player);
      this.addSystemMessage(room, `${player.name} joined the room!`);
    }

    this.notify(room);
    const sanitized = this.sanitizeRoomStateForPlayer(room, player.id);
    return { success: true, roomState: sanitized, playerId: player.id };
  }

  public processAction(roomCode: string, playerId: string, msg: ClientMessage, broadcastAction = true): { success: boolean; roomState?: RoomState } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) return { success: false };

    if (broadcastAction && this.channel) {
      try {
        this.channel.postMessage({
          type: 'ACTION',
          roomCode: code,
          fromPlayerId: playerId,
          payload: msg
        });
      } catch {
        // Ignored
      }
    }

    switch (msg.type) {
      case 'LEAVE_ROOM': {
        const playerIdx = room.players.findIndex(p => p.id === playerId);
        if (playerIdx !== -1) {
          const p = room.players[playerIdx];
          room.players.splice(playerIdx, 1);
          this.addSystemMessage(room, `${p.name} left the room.`);
          if (p.isHost && room.players.length > 0) {
            const nextHost = room.players.find(pl => !pl.isBot) || room.players[0];
            nextHost.isHost = true;
            room.hostId = nextHost.id;
          }
        }
        break;
      }

      case 'UPDATE_SETTINGS': {
        if (room.hostId === playerId) {
          room.settings = { ...room.settings, ...msg.payload };
          this.addSystemMessage(room, 'Room settings updated by host.');
        }
        break;
      }

      case 'TOGGLE_BOT': {
        if (room.hostId !== playerId) break;
        const { action } = msg.payload;
        if (action === 'add') {
          const currentBots = room.players.filter(p => p.isBot);
          const availableAvatars = DESI_AVATARS.filter(a => !room.players.some(p => p.name === a.name));
          const avatarObj = availableAvatars[0] || DESI_AVATARS[0];
          const botPlayer: Player = {
            id: 'bot_' + Math.random().toString(36).substring(2, 9),
            name: `${avatarObj.name} (Bot)`,
            avatar: avatarObj.icon,
            isHost: false,
            isReady: true,
            score: 0,
            isConnected: true,
            isBot: true,
            hand: [],
            sanskarSacrificesLeft: 1
          };
          if (room.phase !== 'lobby') {
            this.dealCardsToPlayer(room, botPlayer, 7);
          }
          room.players.push(botPlayer);
          room.settings.botCount = currentBots.length + 1;
          this.addSystemMessage(room, `${botPlayer.name} has joined to stir the pot!`);
        } else {
          const lastBotIdx = [...room.players].reverse().findIndex(p => p.isBot);
          if (lastBotIdx !== -1) {
            const actualIdx = room.players.length - 1 - lastBotIdx;
            const removed = room.players.splice(actualIdx, 1)[0];
            room.settings.botCount = Math.max(0, room.settings.botCount - 1);
            this.addSystemMessage(room, `${removed.name} left to attend satsang.`);
          }
        }
        break;
      }

      case 'START_GAME': {
        if (room.hostId !== playerId) break;
        this.initializeDecks(room);
        this.startNextRound(room);
        break;
      }

      case 'SUBMIT_CARDS': {
        if (room.phase !== 'submitting') break;
        const player = room.players.find(p => p.id === playerId);
        if (!player || player.id === room.currentJudgeId) break;
        if (room.submissions.some(s => s.playerId === player.id)) break;

        const { cardIds } = msg.payload;
        if (!room.currentBlackCard || cardIds.length !== room.currentBlackCard.pick) break;

        const submittedCards: WhiteCard[] = [];
        for (const cid of cardIds) {
          const card = player.hand.find(c => c.id === cid);
          if (card) submittedCards.push(card);
        }
        if (submittedCards.length !== cardIds.length) break;

        player.hand = player.hand.filter(c => !cardIds.includes(c.id));
        room.submissions.push({
          playerId: player.id,
          playerName: player.name,
          cards: submittedCards,
          revealed: false
        });

        this.checkAllSubmissionsReceived(room);
        break;
      }

      case 'REVEAL_SUBMISSION': {
        if (room.phase !== 'judging') break;
        if (playerId !== room.currentJudgeId && playerId !== room.hostId) break;
        const { submissionIndex } = msg.payload;
        if (typeof submissionIndex === 'number' && room.submissions[submissionIndex]) {
          room.submissions[submissionIndex].revealed = true;
        }
        break;
      }

      case 'SELECT_WINNER': {
        if (room.phase !== 'judging') break;
        if (playerId !== room.currentJudgeId) break;

        const { winnerPlayerId, submissionIndex } = msg.payload;
        let winningSub: Submission | undefined;
        if (typeof submissionIndex === 'number' && room.submissions[submissionIndex]) {
          winningSub = room.submissions[submissionIndex];
        } else if (winnerPlayerId && winnerPlayerId !== 'anonymous') {
          winningSub = room.submissions.find(s => s.playerId === winnerPlayerId);
        }
        if (!winningSub) break;

        const winner = room.players.find(p => p.id === winningSub.playerId);
        if (!winner || !room.currentBlackCard) break;

        winner.score += 1;
        const judge = room.players.find(p => p.id === room.currentJudgeId);
        const commentary = WIN_COMMENTARIES[Math.floor(Math.random() * WIN_COMMENTARIES.length)];

        room.lastWinner = {
          winnerId: winner.id,
          winnerName: winner.name,
          winnerAvatar: winner.avatar,
          winningCards: winningSub.cards,
          blackCard: room.currentBlackCard,
          judgeName: judge ? judge.name : 'Sanskari Czar',
          commentary
        };

        for (const sub of room.submissions) {
          sub.revealed = true;
        }

        this.addSystemMessage(room, `🏆 ${winner.name} won Round ${room.roundNumber}! ${commentary}`);
        if (winner.score >= room.settings.maxScore) {
          room.phase = 'game_over';
        } else {
          room.phase = 'round_winner';
        }
        break;
      }

      case 'NEXT_ROUND': {
        if (room.phase === 'round_winner') {
          this.startNextRound(room);
        }
        break;
      }

      case 'RESTART_GAME': {
        if (room.hostId !== playerId) break;
        for (const p of room.players) {
          p.score = 0;
          p.hand = [];
          p.sanskarSacrificesLeft = 1;
        }
        room.phase = 'lobby';
        room.roundNumber = 0;
        room.submissions = [];
        room.lastWinner = null;
        this.addSystemMessage(room, 'Match restarted. Ready to play again!');
        break;
      }

      case 'SACRIFICE_SANSKAR': {
        const player = room.players.find(p => p.id === playerId);
        if (!player || player.sanskarSacrificesLeft <= 0 || room.phase !== 'submitting') break;
        const { cardIdsToDiscard } = msg.payload;
        if (!cardIdsToDiscard || cardIdsToDiscard.length === 0 || cardIdsToDiscard.length > 3) break;

        player.hand = player.hand.filter(c => !cardIdsToDiscard.includes(c.id));
        player.sanskarSacrificesLeft -= 1;
        this.dealCardsToPlayer(room, player, cardIdsToDiscard.length);
        this.addSystemMessage(room, `⚡ ${player.name} sacrificed sanskar and redrew ${cardIdsToDiscard.length} cards!`);
        break;
      }

      case 'ADD_CUSTOM_CARD': {
        const { isBlack, text, pick } = msg.payload;
        if (!text || text.trim().length === 0) break;
        const trimmed = text.trim();
        if (isBlack) {
          const newBlack: BlackCard = {
            id: 'custom_b_' + Math.random().toString(36).substring(2, 9),
            text: trimmed,
            pick: pick || 1,
            deckId: 'custom'
          };
          room.blackDeck.unshift(newBlack);
          this.addSystemMessage(room, `✨ New prompt card added: "${trimmed}"`);
        } else {
          const newWhite: WhiteCard = {
            id: 'custom_w_' + Math.random().toString(36).substring(2, 9),
            text: trimmed,
            deckId: 'custom'
          };
          room.whiteDeck.unshift(newWhite);
          this.addSystemMessage(room, `✨ New answer card added: "${trimmed}"`);
        }
        break;
      }

      case 'SEND_CHAT': {
        const player = room.players.find(p => p.id === playerId);
        const { text } = msg.payload;
        if (player && text && text.trim().length > 0) {
          const chat: ChatMessage = {
            id: 'chat_' + Math.random().toString(36).substring(2, 9),
            senderId: player.id,
            senderName: player.name,
            senderAvatar: player.avatar,
            text: text.trim().substring(0, 200),
            timestamp: Date.now()
          };
          room.chatMessages.push(chat);
        }
        break;
      }

      case 'SEND_REACTION': {
        const player = room.players.find(p => p.id === playerId);
        const { emoji } = msg.payload;
        if (player && emoji) {
          const reaction: LiveReaction = {
            id: 'rx_' + Math.random().toString(36).substring(2, 9),
            emoji,
            senderName: player.name,
            timestamp: Date.now()
          };
          room.liveReactions.push(reaction);
          this.onReactionCallbacks.forEach(cb => cb(reaction));
          if (this.channel) {
            try {
              this.channel.postMessage({ type: 'REACTION', payload: reaction });
            } catch {
              // Ignored
            }
          }
        }
        break;
      }
    }

    this.notify(room);
    return { success: true, roomState: this.sanitizeRoomStateForPlayer(room, playerId) };
  }

  private initializeDecks(room: LocalRoom) {
    let allBlack: BlackCard[] = [];
    let allWhite: WhiteCard[] = [];

    const activeDecks = DEFAULT_DECKS.filter(d => room.settings.selectedDeckIds.includes(d.id));
    for (const d of activeDecks) {
      allBlack = allBlack.concat(d.blackCards);
      allWhite = allWhite.concat(d.whiteCards);
    }

    room.blackDeck = this.shuffle(allBlack);
    room.whiteDeck = this.shuffle(allWhite);
    room.blackDiscard = [];
    room.whiteDiscard = [];

    for (const player of room.players) {
      player.hand = [];
      this.dealCardsToPlayer(room, player, 7);
    }
  }

  private dealCardsToPlayer(room: LocalRoom, player: Player, count: number) {
    for (let i = 0; i < count; i++) {
      if (room.whiteDeck.length === 0) {
        if (room.whiteDiscard.length > 0) {
          room.whiteDeck = this.shuffle(room.whiteDiscard);
          room.whiteDiscard = [];
        } else {
          room.whiteDeck = this.shuffle(DEFAULT_DECKS[0].whiteCards);
        }
      }
      const card = room.whiteDeck.pop();
      if (card) player.hand.push(card);
    }
  }

  private startNextRound(room: LocalRoom) {
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }

    room.roundNumber += 1;
    room.submissions = [];
    room.lastWinner = null;

    for (const player of room.players) {
      if (player.hand.length < 7) {
        this.dealCardsToPlayer(room, player, 7 - player.hand.length);
      }
    }

    const activePlayers = room.players.filter(p => p.isConnected);
    if (activePlayers.length === 0) return;

    let nextJudgeIndex = 0;
    if (room.currentJudgeId) {
      const currentIdx = activePlayers.findIndex(p => p.id === room.currentJudgeId);
      nextJudgeIndex = (currentIdx + 1) % activePlayers.length;
    }
    const currentJudge = activePlayers[nextJudgeIndex] || activePlayers[0];
    room.currentJudgeId = currentJudge.id;

    if (room.blackDeck.length === 0) {
      if (room.blackDiscard.length > 0) {
        room.blackDeck = this.shuffle(room.blackDiscard);
        room.blackDiscard = [];
      } else {
        room.blackDeck = this.shuffle(DEFAULT_DECKS[0].blackCards);
      }
    }
    room.currentBlackCard = room.blackDeck.pop() || DEFAULT_DECKS[0].blackCards[0];
    room.phase = 'submitting';

    this.addSystemMessage(
      room,
      `🪔 Round ${room.roundNumber}: ${currentJudge.name} is the Sanskari Judge! Prompt: "${room.currentBlackCard.text}"`
    );

    this.scheduleBotSubmissions(room);
    this.notify(room);
  }

  private scheduleBotSubmissions(room: LocalRoom) {
    const bots = room.players.filter(p => p.isBot && p.id !== room.currentJudgeId);
    if (bots.length === 0) return;

    bots.forEach((bot, index) => {
      const delay = (index + 1) * 2500 + Math.random() * 2000;
      setTimeout(() => {
        const currentRoom = this.rooms.get(room.code);
        if (!currentRoom || currentRoom.phase !== 'submitting') return;
        if (currentRoom.submissions.some(s => s.playerId === bot.id)) return;
        if (!currentRoom.currentBlackCard) return;

        const pickCount = currentRoom.currentBlackCard.pick;
        if (bot.hand.length >= pickCount) {
          const chosen = bot.hand.slice(0, pickCount);
          bot.hand = bot.hand.slice(pickCount);
          currentRoom.submissions.push({
            playerId: bot.id,
            playerName: bot.name,
            cards: chosen,
            revealed: false
          });
          this.checkAllSubmissionsReceived(currentRoom);
          this.notify(currentRoom);
        }
      }, delay);
    });
  }

  private checkAllSubmissionsReceived(room: LocalRoom) {
    if (room.phase !== 'submitting') return;

    const humanNonJudges = room.players.filter(p => !p.isBot && p.id !== room.currentJudgeId);
    const unsubmittedHumans = humanNonJudges.filter(p => !room.submissions.some(s => s.playerId === p.id));
    if (unsubmittedHumans.length > 0) {
      return; // Wait for human players!
    }

    const activeNonJudges = room.players.filter(p => p.id !== room.currentJudgeId);
    if (room.submissions.length >= activeNonJudges.length && activeNonJudges.length > 0) {
      this.transitionToJudging(room);
    }
  }

  private transitionToJudging(room: LocalRoom) {
    room.phase = 'judging';
    room.submissions = this.shuffle(room.submissions);
    this.addSystemMessage(room, `All cards are in! Judge ${room.players.find(p => p.id === room.currentJudgeId)?.name} is reviewing the cards.`);

    const judge = room.players.find(p => p.id === room.currentJudgeId);
    if (judge?.isBot && room.submissions.length > 0) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(room.code);
        if (!currentRoom || currentRoom.phase !== 'judging') return;

        for (const s of currentRoom.submissions) s.revealed = true;
        this.notify(currentRoom);

        setTimeout(() => {
          const roomAgain = this.rooms.get(room.code);
          if (!roomAgain || roomAgain.phase !== 'judging') return;

          const randomWin = roomAgain.submissions[Math.floor(Math.random() * roomAgain.submissions.length)];
          const winner = roomAgain.players.find(p => p.id === randomWin.playerId);
          if (winner && roomAgain.currentBlackCard) {
            winner.score += 1;
            const commentary = WIN_COMMENTARIES[Math.floor(Math.random() * WIN_COMMENTARIES.length)];
            roomAgain.lastWinner = {
              winnerId: winner.id,
              winnerName: winner.name,
              winnerAvatar: winner.avatar,
              winningCards: randomWin.cards,
              blackCard: roomAgain.currentBlackCard,
              judgeName: judge.name,
              commentary
            };
            this.addSystemMessage(roomAgain, `🏆 ${judge.name} picked ${winner.name}'s card! ${commentary}`);
            if (winner.score >= roomAgain.settings.maxScore) {
              roomAgain.phase = 'game_over';
            } else {
              roomAgain.phase = 'round_winner';
            }
            this.notify(roomAgain);
          }
        }, 4000);
      }, 3500);
    }
  }

  private addSystemMessage(room: LocalRoom, text: string) {
    const msg: ChatMessage = {
      id: 'sys_' + Math.random().toString(36).substring(2, 9),
      senderId: 'system',
      senderName: 'Sanskari Pandit',
      text,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatMessages.push(msg);
  }

  private sanitizeRoomStateForPlayer(room: LocalRoom, playerId: string): RoomState {
    const hasSubmittedMap: Record<string, boolean> = {};
    for (const s of room.submissions) {
      hasSubmittedMap[s.playerId] = true;
    }

    const maskedPlayers: Player[] = room.players.map(p => {
      if (p.id === playerId) {
        return { ...p };
      }
      return {
        ...p,
        hand: []
      };
    });

    const sanitizedSubmissions: Submission[] = room.submissions.map(sub => {
      if (room.phase === 'round_winner' || room.phase === 'game_over') {
        return sub;
      }
      const isMySub = sub.playerId === playerId;
      return {
        playerId: isMySub ? sub.playerId : 'anonymous',
        playerName: isMySub ? sub.playerName : 'Anonymous Sanskari',
        cards: sub.revealed || isMySub ? sub.cards : [],
        revealed: sub.revealed || isMySub
      };
    });

    return {
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      currentJudgeId: room.currentJudgeId,
      currentBlackCard: room.currentBlackCard,
      roundNumber: room.roundNumber,
      roundTimeRemaining: room.roundTimeRemaining,
      submissions: sanitizedSubmissions,
      hasSubmittedMap,
      lastWinner: room.lastWinner,
      players: maskedPlayers,
      settings: room.settings,
      deckStats: {
        blackRemaining: room.blackDeck.length,
        whiteRemaining: room.whiteDeck.length,
        totalDecks: DEFAULT_DECKS.length + room.customDecks.length
      },
      customDecks: room.customDecks,
      chatMessages: room.chatMessages.slice(-50),
      liveReactions: room.liveReactions.slice(-20)
    };
  }
}

export const clientGameEngine = new ClientGameEngine();
