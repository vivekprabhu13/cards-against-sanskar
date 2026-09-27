import mqtt, { MqttClient } from 'mqtt';
import { RoomState, LiveReaction, ClientMessage, Player } from '../types/game';

const PRIMARY_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const BACKUP_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const TOPIC_PREFIX = 'cas_desi_game_v1';

export interface StatePayload {
  statesByPlayer: Record<string, RoomState>;
  hostId: string;
  roomCode: string;
  timestamp: number;
}

export interface ActionPayload {
  fromPlayerId: string;
  roomCode: string;
  type: string;
  payload: any;
  timestamp: number;
}

type StateListener = (state: RoomState, forPlayerId: string) => void;
type ActionListener = (action: ActionPayload) => void;
type ReactionListener = (reaction: LiveReaction) => void;

export class CloudRelay {
  private client: MqttClient | null = null;
  private currentBroker = PRIMARY_BROKER;
  private isConnecting = false;
  private currentRoomCode = '';
  private stateListeners = new Set<StateListener>();
  private actionListeners = new Set<ActionListener>();
  private reactionListeners = new Set<ReactionListener>();
  private clientId = 'cas_' + Math.random().toString(36).substring(2, 9);
  private connectionPromise: Promise<boolean> | null = null;

  constructor() {
    // Lazily initialized when needed
  }

  public async connect(): Promise<boolean> {
    if (this.client && this.client.connected) {
      return true;
    }
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve) => {
      try {
        this.isConnecting = true;
        const client = mqtt.connect(this.currentBroker, {
          clientId: this.clientId,
          clean: true,
          connectTimeout: 7000,
          reconnectPeriod: 2500,
          keepalive: 30
        });

        const timeout = setTimeout(() => {
          if (!client.connected) {
            console.warn('[CloudRelay] Primary broker timeout, switching to backup broker');
            client.end(true);
            if (this.currentBroker === PRIMARY_BROKER) {
              this.currentBroker = BACKUP_BROKER;
              this.client = null;
              this.connectionPromise = null;
              this.connect().then(resolve);
            } else {
              resolve(false);
            }
          }
        }, 8000);

        client.on('connect', () => {
          clearTimeout(timeout);
          this.client = client;
          this.isConnecting = false;
          console.log(`[CloudRelay] Connected to cloud broker (${this.currentBroker})`);

          // Resubscribe if room code exists
          if (this.currentRoomCode) {
            this.subscribeToRoom(this.currentRoomCode).then(() => resolve(true));
          } else {
            resolve(true);
          }
        });

        client.on('message', (topic, message) => {
          this.handleIncomingMessage(topic, message.toString());
        });

        client.on('error', (err) => {
          console.warn('[CloudRelay] Broker error:', err);
        });

        client.on('offline', () => {
          // Automatic reconnect handled by mqtt.js
        });
      } catch (err) {
        console.error('[CloudRelay] Exception connecting to cloud relay:', err);
        resolve(false);
      }
    });

    return this.connectionPromise;
  }

  public subscribeToState(cb: StateListener) {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  public subscribeToAction(cb: ActionListener) {
    this.actionListeners.add(cb);
    return () => this.actionListeners.delete(cb);
  }

  public subscribeToReaction(cb: ReactionListener) {
    this.reactionListeners.add(cb);
    return () => this.reactionListeners.delete(cb);
  }

  public async setRoom(roomCode: string) {
    const cleanCode = roomCode.toUpperCase().trim();
    if (this.currentRoomCode === cleanCode && this.client?.connected) return;

    if (this.currentRoomCode && this.client?.connected) {
      this.client.unsubscribe(`${TOPIC_PREFIX}/${this.currentRoomCode}/#`);
    }

    this.currentRoomCode = cleanCode;
    await this.connect();
    if (this.client?.connected) {
      await this.subscribeToRoom(cleanCode);
    }
  }

  private subscribeToRoom(roomCode: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client?.connected) return resolve();
      const baseTopic = `${TOPIC_PREFIX}/${roomCode}`;
      this.client.subscribe(`${baseTopic}/#`, { qos: 1 }, (err) => {
        if (err) console.warn('[CloudRelay] Subscribe error:', err);
        resolve();
      });
    });
  }

  public broadcastState(roomCode: string, stateBundle: StatePayload) {
    const topic = `${TOPIC_PREFIX}/${roomCode.toUpperCase().trim()}/state`;
    if (!this.client?.connected) {
      this.connect().then(() => {
        if (this.client?.connected) {
          this.client.publish(topic, JSON.stringify(stateBundle), { qos: 1, retain: true });
        }
      });
      return;
    }
    try {
      this.client.publish(topic, JSON.stringify(stateBundle), { qos: 1, retain: true });
    } catch (e) {
      console.warn('[CloudRelay] Error publishing state:', e);
    }
  }

  public sendAction(roomCode: string, action: ActionPayload) {
    const topic = `${TOPIC_PREFIX}/${roomCode.toUpperCase().trim()}/action`;
    if (!this.client?.connected) {
      this.connect().then(() => {
        if (this.client?.connected) {
          this.client.publish(topic, JSON.stringify(action), { qos: 1 });
        }
      });
      return;
    }
    try {
      this.client.publish(topic, JSON.stringify(action), { qos: 1 });
    } catch (e) {
      console.warn('[CloudRelay] Error publishing action:', e);
    }
  }

  public sendReaction(roomCode: string, reaction: LiveReaction) {
    const topic = `${TOPIC_PREFIX}/${roomCode.toUpperCase().trim()}/reaction`;
    if (!this.client?.connected) {
      this.connect().then(() => {
        if (this.client?.connected) {
          this.client.publish(topic, JSON.stringify(reaction), { qos: 0 });
        }
      });
      return;
    }
    try {
      this.client.publish(topic, JSON.stringify(reaction), { qos: 0 });
    } catch (e) {
      console.warn('[CloudRelay] Error publishing reaction:', e);
    }
  }

  public sendQuery(roomCode: string, fromPlayerId: string) {
    const topic = `${TOPIC_PREFIX}/${roomCode.toUpperCase().trim()}/query`;
    if (!this.client?.connected) {
      this.connect().then(() => {
        if (this.client?.connected) {
          this.client.publish(topic, JSON.stringify({ fromPlayerId, timestamp: Date.now() }), { qos: 1 });
        }
      });
      return;
    }
    try {
      this.client.publish(topic, JSON.stringify({ fromPlayerId, timestamp: Date.now() }), { qos: 1 });
    } catch (e) {
      console.warn('[CloudRelay] Error querying room:', e);
    }
  }

  private handleIncomingMessage(topic: string, messageStr: string) {
    try {
      const parts = topic.split('/');
      const channel = parts[2]; // 'state' | 'action' | 'reaction' | 'query'

      if (channel === 'state') {
        const data: StatePayload = JSON.parse(messageStr);
        if (data && data.statesByPlayer) {
          const myId = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
            ? localStorage.getItem('sanskar_player_id')
            : null;

          if (myId && data.statesByPlayer[myId]) {
            this.stateListeners.forEach(cb => cb(data.statesByPlayer[myId], myId));
          } else {
            // Dispatch all states so any registered listener for their pid picks it up
            for (const [pid, pState] of Object.entries(data.statesByPlayer)) {
              this.stateListeners.forEach(cb => cb(pState, pid));
            }
          }
        }
      } else if (channel === 'action') {
        const action: ActionPayload = JSON.parse(messageStr);
        if (action) {
          this.actionListeners.forEach(cb => cb(action));
        }
      } else if (channel === 'reaction') {
        const reaction: LiveReaction = JSON.parse(messageStr);
        if (reaction) {
          this.reactionListeners.forEach(cb => cb(reaction));
        }
      } else if (channel === 'query') {
        const query = JSON.parse(messageStr);
        // Let host listeners know a new guest wants the latest state
        this.actionListeners.forEach(cb => cb({
          type: 'QUERY_STATE',
          fromPlayerId: query.fromPlayerId || '',
          roomCode: this.currentRoomCode,
          payload: query,
          timestamp: Date.now()
        }));
      }
    } catch (e) {
      console.warn('[CloudRelay] Failed to parse message on topic:', topic, e);
    }
  }

  public isCloudConnected(): boolean {
    return !!(this.client && this.client.connected);
  }
}

export const cloudRelay = new CloudRelay();
