const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database file paths
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const GAMES_FILE = path.join(__dirname, 'data', 'games.json');
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions to read/write JSON files
function readJSON(filepath, defaultValue = []) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${filepath}:`, e.message);
  }
  return defaultValue;
}

function writeJSON(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Error writing ${filepath}:`, e.message);
  }
}

// Game logic functions
function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateTicket(index) {
  const numbers = new Set();
  const ranges = [
    [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
    [50, 59], [60, 69], [70, 79], [80, 90]
  ];

  const seed = index;
  for (let col = 0; col < ranges.length; col++) {
    const [min, max] = ranges[col];
    const count = col < 6 ? 2 : 1;

    for (let i = 0; i < count; i++) {
      const range = max - min + 1;
      const num = min + ((seed + col + i) % range);
      numbers.add(num);
    }
  }

  return Array.from(numbers).sort((a, b) => a - b).slice(0, 15);
}

function detectWin(markedNumbers, drawnNumbers) {
  const drawnSet = new Set(drawnNumbers);
  const matched = markedNumbers.filter(n => drawnSet.has(n));

  if (matched.length >= 13) return 'FULL_HOUSE';
  if (matched.length >= 10) return 'TWO_LINE';
  if (matched.length >= 5) return 'SINGLE_LINE';
  return null;
}

// Broadcast to all clients in a game
function broadcastToGame(gameId, message) {
  const msgStr = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.gameId === gameId && client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  });
}

// API Routes

// Auth - Signup
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const users = readJSON(USERS_FILE, []);

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    username,
    email,
    password: hashedPassword,
    isAdmin: false,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  writeJSON(USERS_FILE, users);

  res.json({
    success: true,
    userId: user.id,
    username: user.username
  });
});

// Auth - Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  const users = readJSON(USERS_FILE, []);
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({
    success: true,
    userId: user.id,
    username: user.username,
    isAdmin: user.isAdmin
  });
});

// Games - List all games
app.get('/api/games', (req, res) => {
  const games = readJSON(GAMES_FILE, []);
  const activeGames = games.filter(g => g.status === 'WAITING' || g.status === 'IN_PROGRESS');
  res.json(activeGames);
});

// Games - Create game
app.post('/api/games/create', (req, res) => {
  const { userId, username } = req.body;

  if (!userId || !username) {
    return res.status(400).json({ error: 'Missing userId or username' });
  }

  const joinCode = generateJoinCode();
  const game = {
    id: uuidv4(),
    joinCode,
    hostId: userId,
    hostName: username,
    players: {
      [userId]: {
        id: userId,
        name: username,
        ticket: generateTicket(0),
        markedNumbers: [],
        status: 'JOINED'
      }
    },
    drawnNumbers: [],
    status: 'WAITING',
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null
  };

  const games = readJSON(GAMES_FILE, []);
  games.push(game);
  writeJSON(GAMES_FILE, games);

  res.json({
    success: true,
    game: {
      id: game.id,
      joinCode: game.joinCode,
      hostName: game.hostName
    }
  });
});

// Games - Join game
app.post('/api/games/join', (req, res) => {
  const { gameId, userId, username } = req.body;

  if (!gameId || !userId || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const games = readJSON(GAMES_FILE, []);
  const game = games.find(g => g.id === gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (game.status !== 'WAITING') {
    return res.status(400).json({ error: 'Game already started' });
  }

  if (Object.keys(game.players).length >= 5) {
    return res.status(400).json({ error: 'Game is full' });
  }

  if (game.players[userId]) {
    return res.status(400).json({ error: 'You already joined this game' });
  }

  const playerIndex = Object.keys(game.players).length;
  game.players[userId] = {
    id: userId,
    name: username,
    ticket: generateTicket(playerIndex),
    markedNumbers: [],
    status: 'JOINED'
  };

  games[games.findIndex(g => g.id === gameId)] = game;
  writeJSON(GAMES_FILE, games);

  res.json({
    success: true,
    game: {
      id: game.id,
      joinCode: game.joinCode,
      players: Object.values(game.players)
    }
  });
});

// Games - Get game details
app.get('/api/games/:gameId', (req, res) => {
  const { gameId } = req.params;
  const games = readJSON(GAMES_FILE, []);
  const game = games.find(g => g.id === gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json(game);
});

// WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      const { type, gameId, userId, ...payload } = message;

      ws.gameId = gameId;
      ws.userId = userId;

      const games = readJSON(GAMES_FILE, []);
      const gameIndex = games.findIndex(g => g.id === gameId);

      if (gameIndex === -1) {
        ws.send(JSON.stringify({ error: 'Game not found' }));
        return;
      }

      const game = games[gameIndex];

      switch (type) {
        case 'JOIN_GAME':
          ws.send(JSON.stringify({
            type: 'GAME_STATE',
            game: game
          }));
          broadcastToGame(gameId, {
            type: 'PLAYER_JOINED',
            player: game.players[userId]
          });
          break;

        case 'DRAW_NUMBER':
          if (game.hostId !== userId) {
            ws.send(JSON.stringify({ error: 'Only host can draw numbers' }));
            return;
          }

          const availableNumbers = Array.from({ length: 90 }, (_, i) => i + 1)
            .filter(n => !game.drawnNumbers.includes(n));

          if (availableNumbers.length === 0) {
            ws.send(JSON.stringify({ error: 'All numbers drawn' }));
            return;
          }

          const drawnNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
          game.drawnNumbers.push(drawnNumber);

          games[gameIndex] = game;
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, {
            type: 'NUMBER_DRAWN',
            number: drawnNumber,
            drawnCount: game.drawnNumbers.length
          });
          break;

        case 'MARK_NUMBER':
          if (!game.players[userId]) return;

          const { number } = payload;
          if (!game.players[userId].markedNumbers.includes(number)) {
            game.players[userId].markedNumbers.push(number);
          }

          const winType = detectWin(
            game.players[userId].markedNumbers,
            game.drawnNumbers
          );

          games[gameIndex] = game;
          writeJSON(GAMES_FILE, games);

          ws.send(JSON.stringify({
            type: 'MARK_CONFIRMED',
            number: number,
            winType: winType
          }));
          break;

        case 'CLAIM_WIN':
          const playerWinType = detectWin(
            game.players[userId].markedNumbers,
            game.drawnNumbers
          );

          broadcastToGame(gameId, {
            type: 'WIN_CLAIMED',
            playerId: userId,
            playerName: game.players[userId].name,
            winType: playerWinType
          });
          break;

        case 'START_GAME':
          if (game.hostId !== userId) {
            ws.send(JSON.stringify({ error: 'Only host can start game' }));
            return;
          }

          game.status = 'IN_PROGRESS';
          game.startedAt = new Date().toISOString();
          games[gameIndex] = game;
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, {
            type: 'GAME_STARTED',
            game: game
          });
          break;

        case 'END_GAME':
          if (game.hostId !== userId) {
            ws.send(JSON.stringify({ error: 'Only host can end game' }));
            return;
          }

          game.status = 'COMPLETED';
          game.endedAt = new Date().toISOString();
          games[gameIndex] = game;
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, {
            type: 'GAME_ENDED',
            game: game
          });
          break;
      }
    } catch (e) {
      console.error('WebSocket error:', e.message);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 CloseHousie Web running on http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🎲 Game page: http://localhost:${PORT}/game`);
});
