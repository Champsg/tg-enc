import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import type { ViteDevServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

interface RoomClient {
  ws: WebSocket;
  userId: string;
  username: string;
  roomId: string;
}

interface RoomData {
  clients: Set<RoomClient>;
  messages: any[]; // Buffered encrypted envelopes (ciphertext only)
  lastActivity: number;
}

const rooms = new Map<string, RoomData>();

function getOrCreateRoom(roomId: string): RoomData {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      clients: new Set(),
      messages: [],
      lastActivity: Date.now(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;
  const payload = JSON.stringify(message);
  for (const client of room.clients) {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function sendPresenceUpdate(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const participants = Array.from(room.clients).map((c) => ({
    userId: c.userId,
    username: c.username,
  }));

  const presenceMsg = {
    type: 'presence',
    roomId,
    count: room.clients.size,
    participants,
  };
  broadcastToRoom(roomId, presenceMsg);
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json({ limit: '25mb' }));

  // REST API Routes
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  app.get('/api/supabase/status', (_req: Request, res: Response) => {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://ylgegpyvnqdhvxerasdj.supabase.co';
    const isConfigured = Boolean(supabaseUrl && (process.env.SUPABASE_ANON_KEY || 'sb_publishable_G5xGPpzGzh1OU-6Kn9gLnQ_FIPzMuTF'));
    res.json({
      configured: isConfigured,
      url: supabaseUrl,
    });
  });

  app.get('/api/room/:roomId', (req: Request, res: Response) => {
    const roomId = req.params.roomId;
    const room = rooms.get(roomId);
    res.json({
      exists: !!room,
      participantCount: room ? room.clients.size : 0,
    });
  });

  app.post('/api/room/:roomId/wipe', (req: Request, res: Response) => {
    const roomId = req.params.roomId;
    const room = rooms.get(roomId);
    if (room) {
      room.messages = [];
      broadcastToRoom(roomId, { type: 'wiped', timestamp: Date.now() });
    }
    res.json({ success: true, message: 'Room wiped' });
  });

  // WebSocket Server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentClient: RoomClient | null = null;

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'join': {
            const { roomId, userId, username } = msg;
            if (!roomId || !userId) return;

            const room = getOrCreateRoom(roomId);

            // Clean up any existing connection for same user in room
            for (const existing of room.clients) {
              if (existing.userId === userId) {
                room.clients.delete(existing);
              }
            }

            currentClient = { ws, userId, username: username || 'Friend', roomId };
            room.clients.add(currentClient);
            room.lastActivity = Date.now();

            // Send initial history buffer (encrypted envelopes) to joining client
            ws.send(
              JSON.stringify({
                type: 'history',
                messages: room.messages,
              })
            );

            // Broadcast presence to all room participants
            sendPresenceUpdate(roomId);
            break;
          }

          case 'envelope': {
            if (!currentClient) return;
            const { roomId } = currentClient;
            const room = rooms.get(roomId);
            if (!room) return;

            const envelope = msg.envelope;
            if (!envelope) return;

            // Keep up to 80 encrypted envelopes in room buffer
            room.messages.push(envelope);
            if (room.messages.length > 80) {
              room.messages.shift();
            }
            room.lastActivity = Date.now();

            // Relay ciphertext envelope to everyone else in the room
            broadcastToRoom(roomId, { type: 'envelope', envelope }, ws);

            // Send delivery confirmation back to sender
            ws.send(
              JSON.stringify({
                type: 'ack',
                id: envelope.id,
                timestamp: Date.now(),
              })
            );
            break;
          }

          case 'typing': {
            if (!currentClient) return;
            const { roomId, userId, username } = currentClient;
            broadcastToRoom(
              roomId,
              {
                type: 'typing',
                userId,
                username,
                isTyping: !!msg.isTyping,
              },
              ws
            );
            break;
          }

          case 'reaction': {
            if (!currentClient) return;
            const { roomId, userId, username } = currentClient;
            const room = rooms.get(roomId);
            if (room) {
              // Update target message reaction in buffer if present
              const target = room.messages.find((m) => m.id === msg.targetMessageId);
              if (target) {
                if (!target.reactions) target.reactions = {};
                const list: string[] = target.reactions[msg.emoji] || [];
                if (list.includes(username)) {
                  target.reactions[msg.emoji] = list.filter((u: string) => u !== username);
                } else {
                  target.reactions[msg.emoji] = [...list, username];
                }
              }
            }
            broadcastToRoom(
              roomId,
              {
                type: 'reaction',
                targetMessageId: msg.targetMessageId,
                emoji: msg.emoji,
                userId,
                username,
              },
              ws
            );
            break;
          }

          case 'read_receipt': {
            if (!currentClient) return;
            const { roomId, userId } = currentClient;
            broadcastToRoom(
              roomId,
              {
                type: 'read_receipt',
                messageIds: msg.messageIds,
                readByUserId: userId,
              },
              ws
            );
            break;
          }

          case 'wipe': {
            if (!currentClient) return;
            const { roomId } = currentClient;
            const room = rooms.get(roomId);
            if (room) {
              room.messages = [];
              broadcastToRoom(roomId, { type: 'wiped', timestamp: Date.now() });
            }
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      if (currentClient) {
        const { roomId } = currentClient;
        const room = rooms.get(roomId);
        if (room) {
          room.clients.delete(currentClient);
          sendPresenceUpdate(roomId);

          // If room has been empty for over 6 hours, clean it up
          if (room.clients.size === 0) {
            setTimeout(() => {
              const r = rooms.get(roomId);
              if (r && r.clients.size === 0) {
                rooms.delete(roomId);
              }
            }, 6 * 60 * 60 * 1000);
          }
        }
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket connection error:', err);
    });
  });

  // Mount Vite or static build
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite: ViteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://127.0.0.1:${PORT}/\n`);
    console.log(`tg-enc server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
