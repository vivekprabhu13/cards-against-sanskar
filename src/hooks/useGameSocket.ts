import { useEffect, useRef, useState, useCallback } from 'react';
import { RoomState, ServerMessage, ClientMessage, LiveReaction, GameSettings } from '../types/game';
import confetti from 'canvas-confetti';
import { playDholakThump, playVictoryChime, playCardPlaySound, playChappalSlap } from '../utils/audio';
import { clientGameEngine } from '../utils/clientEngine';

function getBackendBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem('sanskar_backend_url');
  if (custom && custom.trim()) return custom.trim().replace(/\/$/, '');
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/$/, '');
  return '';
}

export function useGameSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isWsConnectedRef = useRef<boolean>(false);
  const isClientEngineModeRef = useRef<boolean>(false);

  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isStandaloneMode, setIsStandaloneMode] = useState<boolean>(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>(() => {
    return localStorage.getItem('sanskar_player_id') || '';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<LiveReaction[]>([]);
  const currentRoomCodeRef = useRef<string>(localStorage.getItem('sanskar_room_code') || '');

  const applyRoomStateUpdate = useCallback((newState: RoomState, playerId?: string) => {
    setRoomState(prev => {
      const previousPhase = prev?.phase;
      const newPhase = newState.phase;

      if (newPhase === 'round_winner' && previousPhase !== 'round_winner') {
        playVictoryChime();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#dc2626', '#10b981', '#fbbf24', '#ffffff']
        });
      } else if (newPhase === 'game_over' && previousPhase !== 'game_over') {
        playVictoryChime();
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#ffd700', '#ff4500', '#ff1493', '#00ff7f']
        });
      } else if (newPhase === 'judging' && previousPhase === 'submitting') {
        playDholakThump();
      }

      return newState;
    });

    if (playerId) {
      setMyPlayerId(playerId);
      localStorage.setItem('sanskar_player_id', playerId);
    }
    if (newState.code) {
      currentRoomCodeRef.current = newState.code;
      localStorage.setItem('sanskar_room_code', newState.code);
    }
  }, []);

  // Listen to ClientGameEngine updates (for Netlify / offline mode)
  useEffect(() => {
    const unsubscribe = clientGameEngine.subscribe((state, forPlayerId) => {
      const activePid = localStorage.getItem('sanskar_player_id') || myPlayerId;
      if (forPlayerId === activePid || !activePid) {
        applyRoomStateUpdate(state, forPlayerId);
      }
    });

    const unReaction = clientGameEngine.onReaction((reaction) => {
      if (reaction.emoji === '🥿') {
        playChappalSlap();
      } else {
        playDholakThump();
      }
      setFloatingReactions(prev => [...prev.slice(-15), reaction]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id));
      }, 3000);
    });

    return () => {
      unsubscribe();
      unReaction();
    };
  }, [myPlayerId, applyRoomStateUpdate]);

  // HTTP Polling fallback function
  const pollRoomState = useCallback(async () => {
    if (isClientEngineModeRef.current) {
      const code = currentRoomCodeRef.current;
      const pid = localStorage.getItem('sanskar_player_id') || myPlayerId;
      if (code && pid) {
        const localState = clientGameEngine.getRoomState(code, pid);
        if (localState) {
          applyRoomStateUpdate(localState, pid);
        }
      }
      return;
    }

    const code = currentRoomCodeRef.current;
    const pid = localStorage.getItem('sanskar_player_id') || myPlayerId;
    if (!code) return;

    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/room/${code}?playerId=${encodeURIComponent(pid)}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.roomState) {
          applyRoomStateUpdate(data.roomState, data.yourPlayerId || pid);
          setIsConnected(true);
        }
      }
    } catch {
      // Ignore background network blips
    }
  }, [myPlayerId, applyRoomStateUpdate]);

  // Connect via WebSocket
  const connectWs = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isClientEngineModeRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const base = getBackendBaseUrl();
    let wsUrl: string;
    if (base) {
      const wsProto = base.startsWith('https') ? 'wss:' : 'ws:';
      wsUrl = `${wsProto}//${base.replace(/^https?:\/\//, '')}/ws`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        isWsConnectedRef.current = true;
        setIsConnected(true);
        setErrorMessage(null);

        const savedRoom = localStorage.getItem('sanskar_room_code');
        const savedName = localStorage.getItem('sanskar_player_name');
        const savedAvatar = localStorage.getItem('sanskar_player_avatar');
        const savedId = localStorage.getItem('sanskar_player_id');

        if (savedRoom && savedName && savedId) {
          socket.send(JSON.stringify({
            type: 'JOIN_ROOM',
            payload: {
              roomCode: savedRoom,
              playerName: savedName,
              avatar: savedAvatar || '🥿',
              playerId: savedId
            }
          }));
        }
      };

      socket.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          switch (msg.type) {
            case 'ROOM_STATE':
              applyRoomStateUpdate(msg.payload, msg.yourPlayerId);
              break;
            case 'ERROR':
              setErrorMessage(msg.payload.message);
              setTimeout(() => setErrorMessage(null), 5000);
              break;
            case 'REACTION': {
              const reaction = msg.payload;
              if (reaction.emoji === '🥿') {
                playChappalSlap();
              } else {
                playDholakThump();
              }
              setFloatingReactions(prev => [...prev.slice(-15), reaction]);
              setTimeout(() => {
                setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id));
              }, 3000);
              break;
            }
          }
        } catch {
          // Ignore
        }
      };

      socket.onclose = () => {
        isWsConnectedRef.current = false;
        wsRef.current = null;
        if (!isClientEngineModeRef.current) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWs();
          }, 4000);
        }
      };

      socket.onerror = () => {
        isWsConnectedRef.current = false;
      };
    } catch {
      isWsConnectedRef.current = false;
    }
  }, [applyRoomStateUpdate]);

  useEffect(() => {
    connectWs();

    pollingIntervalRef.current = setInterval(() => {
      pollRoomState();
    }, 1500);

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWs, pollRoomState]);

  // Dispatch message via WebSocket with HTTP fallback and client engine fallback
  const send = useCallback(async (message: ClientMessage) => {
    if (isClientEngineModeRef.current) {
      const code = currentRoomCodeRef.current;
      const pid = localStorage.getItem('sanskar_player_id') || myPlayerId;
      if (code && pid) {
        clientGameEngine.processAction(code, pid, message);
      }
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return;
    }

    // HTTP API fallback
    const code = currentRoomCodeRef.current;
    const pid = localStorage.getItem('sanskar_player_id') || myPlayerId;
    const base = getBackendBaseUrl();

    if (code && pid) {
      try {
        const res = await fetch(`${base}/api/room/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode: code,
            playerId: pid,
            message
          })
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.roomState) {
            applyRoomStateUpdate(data.roomState, pid);
            return;
          }
        }
      } catch {
        // Fallback to client engine if backend failed
      }

      // If server action failed or wasn't available, try client engine
      clientGameEngine.processAction(code, pid, message);
    }
  }, [myPlayerId, applyRoomStateUpdate]);

  const createRoom = useCallback(async (playerName: string, avatar: string, customCode?: string) => {
    localStorage.setItem('sanskar_player_name', playerName);
    localStorage.setItem('sanskar_player_avatar', avatar);

    // Try WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'CREATE_ROOM',
        payload: { playerName, avatar, roomCode: customCode }
      }));
      return;
    }

    // Try HTTP backend
    const base = getBackendBaseUrl();
    let backendSuccess = false;

    try {
      const res = await fetch(`${base}/api/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, avatar, roomCode: customCode })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.roomState) {
          backendSuccess = true;
          applyRoomStateUpdate(data.roomState, data.playerId);
          return;
        }
      }
    } catch {
      // Backend not running (e.g. Netlify static hosting)
    }

    // NETLIFY / STATIC HOSTING FALLBACK:
    // If backend is not available, automatically use the client game engine!
    if (!backendSuccess) {
      isClientEngineModeRef.current = true;
      setIsStandaloneMode(true);
      const result = clientGameEngine.createRoom(playerName, avatar, customCode);
      applyRoomStateUpdate(result.roomState, result.playerId);
    }
  }, [applyRoomStateUpdate]);

  const joinRoom = useCallback(async (roomCode: string, playerName: string, avatar: string) => {
    const cleanCode = roomCode.toUpperCase().trim();
    localStorage.setItem('sanskar_player_name', playerName);
    localStorage.setItem('sanskar_player_avatar', avatar);
    localStorage.setItem('sanskar_room_code', cleanCode);
    currentRoomCodeRef.current = cleanCode;

    // Try WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'JOIN_ROOM',
        payload: {
          roomCode: cleanCode,
          playerName,
          avatar,
          playerId: myPlayerId
        }
      }));
      return;
    }

    // Try HTTP backend
    const base = getBackendBaseUrl();
    let joinedBackend = false;

    try {
      const res = await fetch(`${base}/api/room/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: cleanCode,
          playerName,
          avatar,
          playerId: myPlayerId
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.roomState) {
          joinedBackend = true;
          applyRoomStateUpdate(data.roomState, data.playerId);
          return;
        } else if (data.error) {
          setErrorMessage(data.error);
          return;
        }
      }
    } catch {
      // Backend unavailable
    }

    // Try client engine fallback
    if (!joinedBackend) {
      const localResult = clientGameEngine.joinRoom(cleanCode, playerName, avatar, myPlayerId);
      if (localResult.success && localResult.roomState) {
        isClientEngineModeRef.current = true;
        setIsStandaloneMode(true);
        applyRoomStateUpdate(localResult.roomState, localResult.playerId);
      } else {
        setErrorMessage(localResult.error || `Could not find room "${cleanCode}". Make sure the room was created in this browser or connect a backend server.`);
      }
    }
  }, [myPlayerId, applyRoomStateUpdate]);

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('sanskar_room_code');
    currentRoomCodeRef.current = '';
    send({ type: 'LEAVE_ROOM' });
    setRoomState(null);
  }, [send]);

  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    send({ type: 'UPDATE_SETTINGS', payload: settings });
  }, [send]);

  const startGame = useCallback(() => {
    playDholakThump();
    send({ type: 'START_GAME' });
  }, [send]);

  const submitCards = useCallback((cardIds: string[]) => {
    playCardPlaySound();
    send({ type: 'SUBMIT_CARDS', payload: { cardIds } });
  }, [send]);

  const revealSubmission = useCallback((submissionIndex: number) => {
    playCardPlaySound();
    send({ type: 'REVEAL_SUBMISSION', payload: { submissionIndex } });
  }, [send]);

  const selectWinner = useCallback((winnerPlayerId?: string, submissionIndex?: number) => {
    send({ type: 'SELECT_WINNER', payload: { winnerPlayerId, submissionIndex } });
  }, [send]);

  const nextRound = useCallback(() => {
    send({ type: 'NEXT_ROUND' });
  }, [send]);

  const restartGame = useCallback(() => {
    send({ type: 'RESTART_GAME' });
  }, [send]);

  const sacrificeSanskar = useCallback((cardIdsToDiscard: string[]) => {
    playChappalSlap();
    send({ type: 'SACRIFICE_SANSKAR', payload: { cardIdsToDiscard } });
  }, [send]);

  const addCustomCard = useCallback((isBlack: boolean, text: string, pick: 1 | 2 = 1) => {
    send({ type: 'ADD_CUSTOM_CARD', payload: { isBlack, text, pick } });
  }, [send]);

  const toggleBot = useCallback((action: 'add' | 'remove') => {
    send({ type: 'TOGGLE_BOT', payload: { action } });
  }, [send]);

  const sendChat = useCallback((text: string) => {
    send({ type: 'SEND_CHAT', payload: { text } });
  }, [send]);

  const sendReaction = useCallback((emoji: string) => {
    send({ type: 'SEND_REACTION', payload: { emoji } });
  }, [send]);

  return {
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
    clearError: () => setErrorMessage(null)
  };
}
