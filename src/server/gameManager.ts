import { WebSocket } from 'ws';
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
  ServerMessage
} from '../types/game';
import { DEFAULT_DECKS, WIN_COMMENTARIES, DESI_AVATARS } from '../data/defaultDecks';

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  roomCode: string;
}

interface ServerRoom {
  code: string;
  hostId: string;
  phase: GamePhase;
  currentJudgeId: string;
  currentBlackCard: BlackCard | null;
  roundNumber: number;
  roundTimeRemaining: number | null;
  timerInterval: NodeJS.Timeout | null;
  botTimeout: NodeJS.Timeout | null;
  submissions: Submission[]; // server holds real submissions
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

export class GameManager {
  private rooms = new Map<string, ServerRoom>();
  private clients = new Map<WebSocket, ConnectedClient>();

  constructor() {}

  // Generate distinct uppercase room codes like SANSK, SHRMA, RISHT, etc.
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
    if (playerId) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.isConnected = true;
        player.lastActive = Date.now();
      }
    }
    return this.sanitizeRoomStateForPlayer(room, playerId);
  }

  public processCreate(playerName: string, avatar: string, requestedCode?: string): { success: boolean; roomState?: RoomState; playerId: string; roomCode: string } {
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

    const room: ServerRoom = {
      code,
      hostId: playerId,
      phase: 'lobby',
      currentJudgeId: '',
      currentBlackCard: null,
      roundNumber: 0,
      roundTimeRemaining: null,
      timerInterval: null,
      botTimeout: null,
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
    this.addSystemMessage(room, `Swagatam! Room ${code} was created by ${hostPlayer.name}. Share the code with your friends!`);
    const sanitized = this.sanitizeRoomStateForPlayer(room, playerId);
    return { success: true, roomState: sanitized, playerId, roomCode: code };
  }

  public processJoin(roomCode: string, playerName: string, avatar: string, existingPlayerId?: string): { success: boolean; roomState?: RoomState; playerId?: string; error?: string } {
    const code = (roomCode || '').toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: `Room "${code}" not found.` };
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

    this.broadcastRoomState(room);
    const sanitized = this.sanitizeRoomStateForPlayer(room, player.id);
    return { success: true, roomState: sanitized, playerId: player.id };
  }

  public processAction(roomCode: string, playerId: string, msg: any): { success: boolean; error?: string; roomState?: RoomState } {
    const room = this.rooms.get(roomCode.toUpperCase().trim());
    if (!room) return { success: false, error: 'Room not found' };

    if (playerId) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.isConnected = true;
        player.lastActive = Date.now();
      }
    }

    // Fake ws wrapper that delegates broadcast
    const mockWs: any = {
      readyState: WebSocket.OPEN,
      send: () => {}
    };
    this.clients.set(mockWs, { ws: mockWs, playerId, roomCode: room.code });
    this.handleMessage(mockWs, msg);
    this.clients.delete(mockWs);

    const updated = this.sanitizeRoomStateForPlayer(room, playerId);
    return { success: true, roomState: updated };
  }

  public handleConnection(ws: WebSocket) {
    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(ws, msg);
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });
  }

  private handleDisconnect(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (!client) return;

    const room = this.rooms.get(client.roomCode);
    this.clients.delete(ws);

    if (room) {
      const player = room.players.find(p => p.id === client.playerId);
      if (player) {
        player.isConnected = false;
        this.addSystemMessage(room, `${player.name} got disconnected.`);

        // If all human players are disconnected, cleanup after 5 minutes
        const anyHumansConnected = room.players.some(p => !p.isBot && p.isConnected);
        if (!anyHumansConnected) {
          setTimeout(() => {
            const checkRoom = this.rooms.get(room.code);
            if (checkRoom && !checkRoom.players.some(p => !p.isBot && p.isConnected)) {
              if (checkRoom.timerInterval) clearInterval(checkRoom.timerInterval);
              if (checkRoom.botTimeout) clearTimeout(checkRoom.botTimeout);
              this.rooms.delete(room.code);
            }
          }, 300000);
        } else if (player.isHost) {
          // Transfer host to first connected human
          const nextHost = room.players.find(p => !p.isBot && p.isConnected);
          if (nextHost) {
            player.isHost = false;
            nextHost.isHost = true;
            room.hostId = nextHost.id;
            this.addSystemMessage(room, `${nextHost.name} is now the host.`);
          }
        }
        this.broadcastRoomState(room);
      }
    }
  }

  private sendTo(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(room: ServerRoom, message: ServerMessage) {
    for (const [ws, client] of this.clients.entries()) {
      if (client.roomCode === room.code && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  private broadcastRoomState(room: ServerRoom) {
    for (const [ws, client] of this.clients.entries()) {
      if (client.roomCode === room.code && ws.readyState === WebSocket.OPEN) {
        const maskedState = this.sanitizeRoomStateForPlayer(room, client.playerId);
        this.sendTo(ws, {
          type: 'ROOM_STATE',
          payload: maskedState,
          yourPlayerId: client.playerId
        });
      }
    }
  }

  private sanitizeRoomStateForPlayer(room: ServerRoom, playerId: string): RoomState {
    const isJudge = room.currentJudgeId === playerId;
    const hasSubmittedMap: Record<string, boolean> = {};
    for (const s of room.submissions) {
      hasSubmittedMap[s.playerId] = true;
    }

    // Mask player hands and submission identities appropriately
    const maskedPlayers: Player[] = room.players.map(p => {
      if (p.id === playerId) {
        return { ...p };
      }
      return {
        ...p,
        hand: [] // do not expose other players' hands
      };
    });

    // In 'judging' phase: mask playerId so judge cannot see who submitted what unless revealed or round_winner
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

  private addSystemMessage(room: ServerRoom, text: string) {
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

  private handleMessage(ws: WebSocket, msg: any) {
    switch (msg.type) {
      case 'CREATE_ROOM': {
        const { playerName, avatar, roomCode: requestedCode } = msg.payload || {};
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

        const room: ServerRoom = {
          code,
          hostId: playerId,
          phase: 'lobby',
          currentJudgeId: '',
          currentBlackCard: null,
          roundNumber: 0,
          roundTimeRemaining: null,
          timerInterval: null,
          botTimeout: null,
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
        this.clients.set(ws, { ws, playerId, roomCode: code });

        this.addSystemMessage(room, `Swagatam! Room ${code} was created by ${hostPlayer.name}. Share the code with your friends!`);
        this.broadcastRoomState(room);
        break;
      }

      case 'JOIN_ROOM': {
        const { roomCode, playerName, avatar, playerId: existingPlayerId } = msg.payload || {};
        const code = (roomCode || '').toUpperCase().trim();
        const room = this.rooms.get(code);

        if (!room) {
          this.sendTo(ws, { type: 'ERROR', payload: { message: `Room "${code}" not found. Check the code and try again!` } });
          return;
        }

        let player: Player | undefined;

        // Check if player reconnecting
        if (existingPlayerId) {
          player = room.players.find(p => p.id === existingPlayerId);
        }

        if (player) {
          player.isConnected = true;
          if (playerName) player.name = playerName.trim().substring(0, 24);
          if (avatar) player.avatar = avatar;
          this.addSystemMessage(room, `${player.name} returned to the room.`);
        } else {
          // New player
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

          // If game already started, deal 7 cards right away so they can participate in the next round
          if (room.phase !== 'lobby') {
            this.dealCardsToPlayer(room, player, 7);
          }

          room.players.push(player);
          this.addSystemMessage(room, `${player.name} joined the room!`);
        }

        this.clients.set(ws, { ws, playerId: player.id, roomCode: code });
        this.broadcastRoomState(room);
        break;
      }

      case 'LEAVE_ROOM': {
        this.handleDisconnect(ws);
        break;
      }

      case 'UPDATE_SETTINGS': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room || room.hostId !== client.playerId) return;

        room.settings = { ...room.settings, ...msg.payload };
        this.addSystemMessage(room, `Game settings updated by the host.`);
        this.broadcastRoomState(room);
        break;
      }

      case 'TOGGLE_BOT': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room || room.hostId !== client.playerId) return;

        const { action } = msg.payload || {};
        if (action === 'add') {
          const botNames = [
            { name: 'Aunty Ji (Bot)', avatar: '🥿' },
            { name: 'Sharma Ji (Bot)', avatar: '👔' },
            { name: 'Pandit Ji (Bot)', avatar: '🪔' },
            { name: 'Rebel Beti (Bot)', avatar: '🕶️' },
            { name: 'WhatsApp Admin (Bot)', avatar: '📱' },
          ];
          const existingBotCount = room.players.filter(p => p.isBot).length;
          const botInfo = botNames[existingBotCount % botNames.length];
          const botPlayer: Player = {
            id: 'bot_' + Math.random().toString(36).substring(2, 9),
            name: botInfo.name,
            avatar: botInfo.avatar,
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
          room.settings.botCount = room.players.filter(p => p.isBot).length;
          this.addSystemMessage(room, `${botPlayer.name} has joined to stir the pot!`);
        } else if (action === 'remove') {
          const botIdx = room.players.findIndex(p => p.isBot);
          if (botIdx !== -1) {
            const removed = room.players.splice(botIdx, 1)[0];
            room.settings.botCount = room.players.filter(p => p.isBot).length;
            this.addSystemMessage(room, `${removed.name} left the room.`);
          }
        }
        this.broadcastRoomState(room);
        break;
      }

      case 'START_GAME': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room || room.hostId !== client.playerId) return;

        if (room.players.length < 3) {
          this.sendTo(ws, {
            type: 'ERROR',
            payload: { message: 'Cards Against Sanskar needs at least 3 players! Invite friends or click "Add Bot Aunties".' }
          });
          return;
        }

        this.initCardDecks(room);

        // Reset scores
        for (const p of room.players) {
          p.score = 0;
          p.hand = [];
          p.sanskarSacrificesLeft = 1;
          this.dealCardsToPlayer(room, p, 7);
        }

        room.roundNumber = 0;
        room.lastWinner = null;

        this.startNextRound(room);
        break;
      }

      case 'SUBMIT_CARDS': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room || room.phase !== 'submitting') return;

        const player = room.players.find(p => p.id === client.playerId);
        if (!player || player.id === room.currentJudgeId) return; // judge cannot submit

        // Check already submitted
        if (room.submissions.some(s => s.playerId === player.id)) return;

        const { cardIds } = msg.payload || {};
        if (!Array.isArray(cardIds) || !room.currentBlackCard) return;

        if (cardIds.length !== room.currentBlackCard.pick) {
          this.sendTo(ws, {
            type: 'ERROR',
            payload: { message: `Please choose exactly ${room.currentBlackCard.pick} card(s).` }
          });
          return;
        }

        // Validate player holds these cards
        const submittedCards: WhiteCard[] = [];
        for (const cid of cardIds) {
          const card = player.hand.find(c => c.id === cid);
          if (!card) return;
          submittedCards.push(card);
        }

        // Remove from hand
        player.hand = player.hand.filter(c => !cardIds.includes(c.id));

        room.submissions.push({
          playerId: player.id,
          playerName: player.name,
          cards: submittedCards,
          revealed: false
        });

        // Check if all non-judge active players have submitted
        this.checkAllSubmissionsReceived(room);
        this.broadcastRoomState(room);
        break;
      }

      case 'REVEAL_SUBMISSION': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room || room.phase !== 'judging') return;

        // Judge or host can reveal cards
        if (client.playerId !== room.currentJudgeId && client.playerId !== room.hostId) return;

        const { submissionIndex } = msg.payload || {};
        if (typeof submissionIndex === 'number' && room.submissions[submissionIndex]) {
          room.submissions[submissionIndex].revealed = true;
          this.broadcastRoomState(room);
        }
        break;
      }

      case 'SELECT_WINNER': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room || room.phase !== 'judging') return;

        if (client.playerId !== room.currentJudgeId) return;

        const { winnerPlayerId, submissionIndex } = msg.payload || {};
        let winningSub: Submission | undefined;

        if (typeof submissionIndex === 'number' && room.submissions[submissionIndex]) {
          winningSub = room.submissions[submissionIndex];
        } else if (winnerPlayerId && winnerPlayerId !== 'anonymous') {
          winningSub = room.submissions.find(s => s.playerId === winnerPlayerId);
        }

        if (!winningSub) return;

        const winner = room.players.find(p => p.id === winningSub.playerId);
        if (!winner || !room.currentBlackCard) return;

        winner.score += 1;
        const judge = room.players.find(p => p.id === room.currentJudgeId);

        // Pick a commentary
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

        // Reveal all submissions
        for (const sub of room.submissions) {
          sub.revealed = true;
        }

        this.addSystemMessage(
          room,
          `🏆 ${winner.name} won Round ${room.roundNumber}! ${commentary}`
        );

        if (winner.score >= room.settings.maxScore) {
          room.phase = 'game_over';
          this.addSystemMessage(room, `👑 GAME OVER! ${winner.name} is crowned the Ultimate Sanskari Rebel!`);
        } else {
          room.phase = 'round_winner';
        }

        this.broadcastRoomState(room);
        break;
      }

      case 'NEXT_ROUND': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room) return;

        // Any player or host can trigger next round if in round_winner
        if (room.phase === 'round_winner') {
          this.startNextRound(room);
        }
        break;
      }

      case 'RESTART_GAME': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room || room.hostId !== client.playerId) return;

        room.phase = 'lobby';
        for (const p of room.players) {
          p.score = 0;
          p.hand = [];
          p.sanskarSacrificesLeft = 1;
        }
        room.submissions = [];
        room.currentBlackCard = null;
        room.lastWinner = null;
        if (room.timerInterval) clearInterval(room.timerInterval);
        if (room.botTimeout) clearTimeout(room.botTimeout);

        this.addSystemMessage(room, 'The game has been returned to the lobby for new settings or players.');
        this.broadcastRoomState(room);
        break;
      }

      case 'SACRIFICE_SANSKAR': {
        // Discard up to 3 cards and get new ones (once per game)
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room || room.phase !== 'submitting') return;

        const player = room.players.find(p => p.id === client.playerId);
        if (!player || player.sanskarSacrificesLeft <= 0) return;

        const { cardIdsToDiscard } = msg.payload || {};
        if (!Array.isArray(cardIdsToDiscard) || cardIdsToDiscard.length === 0) return;

        player.sanskarSacrificesLeft -= 1;
        player.hand = player.hand.filter(c => !cardIdsToDiscard.includes(c.id));
        this.dealCardsToPlayer(room, player, 7 - player.hand.length);

        this.addSystemMessage(room, `${player.name} sacrificed their Sanskar to redraw cards!`);
        this.broadcastRoomState(room);
        break;
      }

      case 'ADD_CUSTOM_CARD': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room || !room.settings.allowCustomCards) return;

        const player = room.players.find(p => p.id === client.playerId);
        const { isBlack, text, pick } = msg.payload || {};
        if (!text || text.trim().length < 3) return;

        const cleanText = text.trim();
        let customDeck = room.customDecks.find(d => d.id === 'custom_room');
        if (!customDeck) {
          customDeck = {
            id: 'custom_room',
            name: 'Room Custom Deck',
            icon: '✨',
            description: 'Custom prompts and zingers created live by players in this room.',
            blackCards: [],
            whiteCards: [],
            isCustom: true
          };
          room.customDecks.push(customDeck);
        }

        if (isBlack) {
          const blackCard: BlackCard = {
            id: 'custom_b_' + Math.random().toString(36).substring(2, 9),
            text: cleanText.includes('____') ? cleanText : `${cleanText} ____.`,
            pick: pick === 2 ? 2 : 1,
            deckId: 'custom_room',
            author: player?.name || 'Someone'
          };
          customDeck.blackCards.push(blackCard);
          room.blackDeck.push(blackCard);
          this.addSystemMessage(room, `📝 ${player?.name || 'A player'} added a custom Black Card: "${blackCard.text}"`);
        } else {
          const whiteCard: WhiteCard = {
            id: 'custom_w_' + Math.random().toString(36).substring(2, 9),
            text: cleanText,
            deckId: 'custom_room',
            author: player?.name || 'Someone'
          };
          customDeck.whiteCards.push(whiteCard);
          room.whiteDeck.push(whiteCard);
          this.addSystemMessage(room, `🃏 ${player?.name || 'A player'} added a custom White Card: "${whiteCard.text}"`);
        }

        this.broadcastRoomState(room);
        break;
      }

      case 'SEND_CHAT': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === client.playerId);
        const text = (msg.payload?.text || '').trim();
        if (!text || !player) return;

        const chatMsg: ChatMessage = {
          id: 'chat_' + Math.random().toString(36).substring(2, 9),
          senderId: player.id,
          senderName: player.name,
          text: text.substring(0, 300),
          timestamp: Date.now()
        };
        room.chatMessages.push(chatMsg);
        this.broadcastRoomState(room);
        break;
      }

      case 'SEND_REACTION': {
        const client = this.clients.get(ws);
        if (!client) return;
        const room = this.rooms.get(client.roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === client.playerId);
        const emoji = msg.payload?.emoji;
        if (!emoji) return;

        const reaction: LiveReaction = {
          id: 'rx_' + Math.random().toString(36).substring(2, 9),
          emoji,
          senderName: player?.name || 'Someone',
          timestamp: Date.now(),
          x: Math.floor(Math.random() * 80) + 10 // 10% to 90%
        };

        room.liveReactions.push(reaction);
        this.broadcast(room, { type: 'REACTION', payload: reaction });
        break;
      }

      case 'PING': {
        this.sendTo(ws, { type: 'PONG' });
        break;
      }
    }
  }

  private initCardDecks(room: ServerRoom) {
    const selectedDecks = DEFAULT_DECKS.filter(d => room.settings.selectedDeckIds.includes(d.id));
    const allCustom = room.customDecks;

    let blackCards: BlackCard[] = [];
    let whiteCards: WhiteCard[] = [];

    for (const d of [...selectedDecks, ...allCustom]) {
      blackCards.push(...d.blackCards);
      whiteCards.push(...d.whiteCards);
    }

    // Safety fallback if empty
    if (blackCards.length === 0) blackCards = [...DEFAULT_DECKS[0].blackCards];
    if (whiteCards.length === 0) whiteCards = [...DEFAULT_DECKS[0].whiteCards];

    room.blackDeck = this.shuffle(blackCards);
    room.whiteDeck = this.shuffle(whiteCards);
    room.blackDiscard = [];
    room.whiteDiscard = [];
  }

  private dealCardsToPlayer(room: ServerRoom, player: Player, count: number) {
    for (let i = 0; i < count; i++) {
      if (room.whiteDeck.length === 0) {
        if (room.whiteDiscard.length > 0) {
          room.whiteDeck = this.shuffle(room.whiteDiscard);
          room.whiteDiscard = [];
        } else {
          // Re-clone defaults if exhausted
          room.whiteDeck = this.shuffle(DEFAULT_DECKS[0].whiteCards);
        }
      }
      const card = room.whiteDeck.pop();
      if (card) player.hand.push(card);
    }
  }

  private startNextRound(room: ServerRoom) {
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
    if (room.botTimeout) {
      clearTimeout(room.botTimeout);
      room.botTimeout = null;
    }

    room.roundNumber += 1;
    room.submissions = [];
    room.lastWinner = null;

    // Replenish player hands to 7
    for (const player of room.players) {
      if (player.hand.length < 7) {
        this.dealCardsToPlayer(room, player, 7 - player.hand.length);
      }
    }

    // Rotate judge clockwise among active players
    const activePlayers = room.players.filter(p => p.isConnected);
    if (activePlayers.length === 0) return;

    let nextJudgeIndex = 0;
    if (room.currentJudgeId) {
      const currentIdx = activePlayers.findIndex(p => p.id === room.currentJudgeId);
      nextJudgeIndex = (currentIdx + 1) % activePlayers.length;
    }
    const currentJudge = activePlayers[nextJudgeIndex] || activePlayers[0];
    room.currentJudgeId = currentJudge.id;

    // Draw Black Card
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

    // Setup round timer if enabled
    if (room.settings.roundTimeoutSeconds > 0) {
      room.roundTimeRemaining = room.settings.roundTimeoutSeconds;
      room.timerInterval = setInterval(() => {
        if (room.roundTimeRemaining !== null && room.roundTimeRemaining > 0) {
          room.roundTimeRemaining -= 1;
          if (room.roundTimeRemaining <= 0) {
            clearInterval(room.timerInterval!);
            room.timerInterval = null;
            this.handleRoundTimeout(room);
          }
          this.broadcastRoomState(room);
        }
      }, 1000);
    } else {
      room.roundTimeRemaining = null;
    }

    // Trigger Bot player submissions
    this.scheduleBotSubmissions(room);

    this.broadcastRoomState(room);
  }

  private scheduleBotSubmissions(room: ServerRoom) {
    const bots = room.players.filter(p => p.isBot && p.id !== room.currentJudgeId);
    if (bots.length === 0) return;

    // Random staggered bot play
    bots.forEach((bot, index) => {
      const delay = (index + 1) * 2000 + Math.random() * 2000;
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
          this.broadcastRoomState(currentRoom);
        }
      }, delay);
    });
  }

  private handleRoundTimeout(room: ServerRoom) {
    if (room.phase !== 'submitting') return;

    // Auto-pick random cards for unsubmitted players
    const nonJudges = room.players.filter(p => p.id !== room.currentJudgeId && p.isConnected);
    for (const player of nonJudges) {
      if (!room.submissions.some(s => s.playerId === player.id)) {
        const pickCount = room.currentBlackCard?.pick || 1;
        if (player.hand.length >= pickCount) {
          const chosen = player.hand.splice(0, pickCount);
          room.submissions.push({
            playerId: player.id,
            playerName: player.name,
            cards: chosen,
            revealed: false
          });
        }
      }
    }

    this.transitionToJudging(room);
  }

  private checkAllSubmissionsReceived(room: ServerRoom) {
    if (room.phase !== 'submitting') return;

    // NEVER advance if any human non-judge player has not submitted yet!
    const humanNonJudges = room.players.filter(p => !p.isBot && p.id !== room.currentJudgeId);
    const unsubmittedHumans = humanNonJudges.filter(p => !room.submissions.some(s => s.playerId === p.id));
    if (unsubmittedHumans.length > 0) {
      // Human players are still choosing their cards. We MUST wait for them!
      return;
    }

    // All humans (if any) have submitted; now check if total submissions cover all active non-judges
    const activeNonJudges = room.players.filter(p => p.id !== room.currentJudgeId);
    if (room.submissions.length >= activeNonJudges.length && activeNonJudges.length > 0) {
      this.transitionToJudging(room);
    }
  }

  private transitionToJudging(room: ServerRoom) {
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
    room.phase = 'judging';
    room.submissions = this.shuffle(room.submissions); // anonymous shuffle
    this.addSystemMessage(room, `All cards are in! Judge ${room.players.find(p => p.id === room.currentJudgeId)?.name} is reviewing the cards.`);

    // If Judge is a Bot, schedule bot selection with comfortable reading pace
    const judge = room.players.find(p => p.id === room.currentJudgeId);
    if (judge?.isBot && room.submissions.length > 0) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(room.code);
        if (!currentRoom || currentRoom.phase !== 'judging') return;
        // Bot reveals cards
        for (const s of currentRoom.submissions) s.revealed = true;
        this.broadcastRoomState(currentRoom);

        // Wait another 4 seconds before picking winner so players can read the submissions
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
            this.broadcastRoomState(roomAgain);
          }
        }, 4000);
      }, 3500);
    }
  }
}
