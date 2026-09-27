import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GameManager } from './src/server/gameManager';
import { DEFAULT_DECKS } from './src/data/defaultDecks';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

const gameManager = new GameManager();

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/decks', (req, res) => {
  res.json(DEFAULT_DECKS);
});

// HTTP Fallback API for cloud proxies / environments where raw WebSockets get redirected
app.post('/api/room/create', (req, res) => {
  const { playerName, avatar, roomCode } = req.body || {};
  const result = gameManager.processCreate(playerName, avatar, roomCode);
  res.json(result);
});

app.post('/api/room/join', (req, res) => {
  const { roomCode, playerName, avatar, playerId } = req.body || {};
  const result = gameManager.processJoin(roomCode, playerName, avatar, playerId);
  res.json(result);
});

app.get('/api/room/:code', (req, res) => {
  const code = req.params.code;
  const playerId = (req.query.playerId as string) || '';
  const roomState = gameManager.getRoomState(code, playerId);
  if (!roomState) {
    res.status(404).json({ error: 'Room not found' });
  } else {
    res.json({ roomState, yourPlayerId: playerId });
  }
});

app.post('/api/room/action', (req, res) => {
  const { roomCode, playerId, message } = req.body || {};
  if (!roomCode || !playerId || !message) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }
  const result = gameManager.processAction(roomCode, playerId, message);
  res.json(result);
});

// Setup WebSocket server attached to the HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  gameManager.handleConnection(ws);
});

// Handle Vite middleware or static serving
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Cards Against Sanskar server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
