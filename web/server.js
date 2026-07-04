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

// Enhanced Tambola Ticket Generation (3x5 format per ticket)
function generateTickets(count, startIndex = 0) {
  const tickets = [];
  const usedNumbers = new Set();

  for (let ticketNum = 0; ticketNum < count; ticketNum++) {
    const ticket = Array(3).fill(null).map(() => Array(9).fill(0));
    const ticketNumbers = new Set();

    // Column ranges for Tambola (1-9, 10-19, ..., 80-90)
    const ranges = [
      { min: 1, max: 9 },
      { min: 10, max: 19 },
      { min: 20, max: 29 },
      { min: 30, max: 39 },
      { min: 40, max: 49 },
      { min: 50, max: 59 },
      { min: 60, max: 69 },
      { min: 70, max: 79 },
      { min: 80, max: 90 }
    ];

    // Fill 5 numbers per row (3 rows = 15 numbers total)
    for (let row = 0; row < 3; row++) {
      let numbersInRow = 0;
      let colAttempts = 0;

      while (numbersInRow < 5 && colAttempts < 50) {
        const col = Math.floor(Math.random() * 9);

        if (ticket[row][col] === 0) {
          const range = ranges[col];
          let num;
          let attempts = 0;

          do {
            const seed = (startIndex * 1000 + ticketNum * 100 + row * 10 + col) * 7 + attempts;
            num = range.min + (seed % (range.max - range.min + 1));
            attempts++;
          } while ((ticketNumbers.has(num) || usedNumbers.has(num)) && attempts < 20);

          if (!ticketNumbers.has(num) && !usedNumbers.has(num)) {
            ticket[row][col] = num;
            ticketNumbers.add(num);
            usedNumbers.add(num);
            numbersInRow++;
          }
        }
        colAttempts++;
      }
    }

    tickets.push({
      id: uuidv4(),
      grid: ticket,
      markedNumbers: [],
      claimedPrizes: []
    });
  }

  return tickets;
}

// Prize detection with amounts
function detectPrizes(markedNumbers, drawnNumbers, ticket, prizePool, claimedPrizes = []) {
  const prizes = [];

  // Check Jaldhi 5 (first 5 numbers marked) - 10%
  if (markedNumbers.length >= 5 && !claimedPrizes.includes('Jaldhi 5')) {
    prizes.push({
      type: 'Jaldhi 5',
      amount: Math.floor(prizePool * 0.10),
      icon: '5️⃣'
    });
  }

  // Check lines - 10% each
  const lines = [0, 1, 2];
  for (const lineIdx of lines) {
    const lineNumbers = ticket[lineIdx].filter(n => n !== 0);
    const markedInLine = lineNumbers.filter(n => markedNumbers.includes(n)).length;

    if (markedInLine === lineNumbers.length) {
      const lineName = lineIdx === 0 ? 'Top Line' : lineIdx === 1 ? 'Middle Line' : 'Bottom Line';
      const lineIcon = lineIdx === 0 ? '⬆️' : lineIdx === 1 ? '➡️' : '⬇️';

      if (!claimedPrizes.includes(lineName)) {
        prizes.push({
          type: lineName,
          amount: Math.floor(prizePool * 0.10),
          icon: lineIcon
        });
      }
    }
  }

  // Check Full Housie (all 15 numbers) - 30%
  const totalNumbers = ticket.flat().filter(n => n !== 0).length;
  const markedTotal = ticket.flat()
    .filter(n => n !== 0)
    .filter(n => markedNumbers.includes(n)).length;

  if (markedTotal === totalNumbers && !claimedPrizes.includes('Full Housie')) {
    prizes.push({
      type: 'Full Housie',
      amount: Math.floor(prizePool * 0.30),
      icon: '🏆'
    });
  }

  return prizes;
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
  const { userId, username, ticketCount, ticketPrice } = req.body;

  if (!userId || !username || !ticketCount || ticketPrice === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const joinCode = generateJoinCode();
  const totalPoolAmount = ticketCount * ticketPrice;

  const game = {
    id: uuidv4(),
    joinCode,
    hostId: userId,
    hostName: username,
    ticketPrice: ticketPrice,
    prizePool: ticketPrice * ticketCount,
    players: {
      [userId]: {
        id: userId,
        name: username,
        tickets: generateTickets(ticketCount, 0),
        status: 'JOINED',
        amountPaid: ticketPrice * ticketCount,
        claimedPrizes: []
      }
    },
    drawnNumbers: [],
    drawnNumberSequence: [],
    status: 'WAITING',
    isDrawing: false,
    prizes: {},
    leaderboard: [],
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
      hostName: game.hostName,
      ticketPrice: ticketPrice
    }
  });
});

// Games - Join game
app.post('/api/games/join', (req, res) => {
  const { gameId, userId, username, ticketCount } = req.body;

  if (!gameId || !userId || !username || !ticketCount) {
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
  const usedNumbers = new Set();

  // Collect all used numbers from other players' tickets
  Object.values(game.players).forEach(player => {
    player.tickets.forEach(ticket => {
      ticket.grid.flat().forEach(num => {
        if (num !== 0) usedNumbers.add(num);
      });
    });
  });

  // Generate tickets avoiding used numbers
  game.players[userId] = {
    id: userId,
    name: username,
    tickets: generateTickets(ticketCount, playerIndex),
    status: 'JOINED',
    amountPaid: ticketCount * game.ticketPrice,
    claimedPrizes: []
  };

  game.prizePool += ticketCount * game.ticketPrice;

  games[games.findIndex(g => g.id === gameId)] = game;
  writeJSON(GAMES_FILE, games);

  res.json({
    success: true,
    game: {
      id: game.id,
      joinCode: game.joinCode,
      players: Object.values(game.players),
      ticketPrice: game.ticketPrice,
      prizePool: game.prizePool
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
          game.drawnNumberSequence.push({
            number: drawnNumber,
            time: new Date().toISOString()
          });

          games[gameIndex] = game;
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, {
            type: 'NUMBER_DRAWN',
            number: drawnNumber,
            drawnCount: game.drawnNumbers.length,
            sequence: game.drawnNumberSequence
          });
          break;

        case 'MARK_NUMBER':
          if (!game.players[userId]) return;

          const { ticketId, number } = payload;
          const ticket = game.players[userId].tickets.find(t => t.id === ticketId);

          if (ticket && !ticket.markedNumbers.includes(number)) {
            ticket.markedNumbers.push(number);
          }

          games[gameIndex] = game;
          writeJSON(GAMES_FILE, games);

          ws.send(JSON.stringify({
            type: 'MARK_CONFIRMED',
            number: number
          }));
          break;

        case 'CLAIM_WIN':
          const { ticketId: claimTicketId, prizeType } = payload;
          const claimTicket = game.players[userId].tickets.find(t => t.id === claimTicketId);

          if (claimTicket) {
            const prizes = detectPrizes(claimTicket.markedNumbers, game.drawnNumbers, claimTicket.grid, game.prizePool, game.players[userId].claimedPrizes.map(p => p.type));
            const prizeMatch = prizes.find(p => p.type === prizeType);

            if (prizeMatch) {
              // Pause auto-drawing
              game.isDrawing = false;

              // Check if prize was already claimed by others
              if (!game.prizes[prizeType]) {
                game.prizes[prizeType] = {
                  winners: [{ playerId: userId, playerName: game.players[userId].name, amount: prizeMatch.amount }],
                  totalAmount: prizeMatch.amount,
                  icon: prizeMatch.icon,
                  claimedAt: new Date().toISOString()
                };
              } else {
                // Multiple winners - split the prize
                const existingWinners = game.prizes[prizeType].winners || [];
                const totalWinners = existingWinners.length + 1;
                const amountPerWinner = Math.floor(prizeMatch.amount / totalWinners);

                game.prizes[prizeType].winners = [
                  ...existingWinners.map(w => ({ ...w, amount: amountPerWinner })),
                  { playerId: userId, playerName: game.players[userId].name, amount: amountPerWinner }
                ];
                game.prizes[prizeType].totalAmount = amountPerWinner * totalWinners;
              }

              game.players[userId].claimedPrizes.push({
                type: prizeType,
                amount: game.prizes[prizeType].winners.find(w => w.playerId === userId).amount,
                icon: prizeMatch.icon
              });

              // Build leaderboard
              const leaderboard = [];
              Object.entries(game.players).forEach(([pId, player]) => {
                if (player.claimedPrizes.length > 0) {
                  const totalWinnings = player.claimedPrizes.reduce((sum, p) => sum + p.amount, 0);
                  leaderboard.push({
                    playerId: pId,
                    playerName: player.name,
                    prizes: player.claimedPrizes,
                    totalWinnings: totalWinnings
                  });
                }
              });

              games[gameIndex] = game;
              writeJSON(GAMES_FILE, games);

              broadcastToGame(gameId, {
                type: 'PRIZE_CLAIMED',
                playerId: userId,
                playerName: game.players[userId].name,
                prizeType: prizeType,
                prizes: game.prizes,
                leaderboard: leaderboard,
                gameStatus: 'PAUSED'
              });
            }
          }
          break;

        case 'START_GAME':
          if (game.hostId !== userId) {
            ws.send(JSON.stringify({ error: 'Only host can start game' }));
            return;
          }

          game.status = 'IN_PROGRESS';
          game.isDrawing = true;
          game.startedAt = new Date().toISOString();
          games[gameIndex] = game;
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, {
            type: 'GAME_STARTED',
            game: game
          });

          // Start auto-drawing every 3 seconds
          const autoDrawInterval = setInterval(() => {
            const currentGames = readJSON(GAMES_FILE, []);
            const currentGame = currentGames.find(g => g.id === gameId);

            if (!currentGame || !currentGame.isDrawing || currentGame.status !== 'IN_PROGRESS') {
              clearInterval(autoDrawInterval);
              return;
            }

            const availableNumbers = Array.from({ length: 90 }, (_, i) => i + 1)
              .filter(n => !currentGame.drawnNumbers.includes(n));

            if (availableNumbers.length === 0) {
              clearInterval(autoDrawInterval);
              return;
            }

            const drawnNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
            currentGame.drawnNumbers.push(drawnNumber);
            currentGame.drawnNumberSequence.push({
              number: drawnNumber,
              time: new Date().toISOString()
            });

            const gameIndexUpdate = currentGames.findIndex(g => g.id === gameId);
            currentGames[gameIndexUpdate] = currentGame;
            writeJSON(GAMES_FILE, currentGames);

            broadcastToGame(gameId, {
              type: 'NUMBER_DRAWN',
              number: drawnNumber,
              drawnCount: currentGame.drawnNumbers.length,
              sequence: currentGame.drawnNumberSequence.slice(-10)
            });
          }, 3000);
          break;

        case 'RESUME_DRAWING':
          if (game.hostId !== userId) {
            ws.send(JSON.stringify({ error: 'Only host can resume drawing' }));
            return;
          }

          game.isDrawing = true;
          games[gameIndex] = game;
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, {
            type: 'DRAWING_RESUMED',
            game: game
          });

          // Resume auto-drawing
          const resumeDrawInterval = setInterval(() => {
            const currentGames = readJSON(GAMES_FILE, []);
            const currentGame = currentGames.find(g => g.id === gameId);

            if (!currentGame || !currentGame.isDrawing || currentGame.status !== 'IN_PROGRESS') {
              clearInterval(resumeDrawInterval);
              return;
            }

            const availableNumbers = Array.from({ length: 90 }, (_, i) => i + 1)
              .filter(n => !currentGame.drawnNumbers.includes(n));

            if (availableNumbers.length === 0) {
              clearInterval(resumeDrawInterval);
              return;
            }

            const drawnNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
            currentGame.drawnNumbers.push(drawnNumber);
            currentGame.drawnNumberSequence.push({
              number: drawnNumber,
              time: new Date().toISOString()
            });

            const gameIndexUpdate = currentGames.findIndex(g => g.id === gameId);
            currentGames[gameIndexUpdate] = currentGame;
            writeJSON(GAMES_FILE, currentGames);

            broadcastToGame(gameId, {
              type: 'NUMBER_DRAWN',
              number: drawnNumber,
              drawnCount: currentGame.drawnNumbers.length,
              sequence: currentGame.drawnNumberSequence.slice(-10)
            });
          }, 3000);
          break;

        case 'END_GAME':
          if (game.hostId !== userId) {
            ws.send(JSON.stringify({ error: 'Only host can end game' }));
            return;
          }

          // Delete the game from the list
          games.splice(gameIndex, 1);
          writeJSON(GAMES_FILE, games);

          // Broadcast end game to all players
          broadcastToGame(gameId, {
            type: 'GAME_ENDED',
            message: 'Game has been ended by host. Cache will be cleared.'
          });

          // Close all WebSocket connections for this game
          setTimeout(() => {
            wss.clients.forEach(client => {
              if (client.gameId === gameId && client.readyState === WebSocket.OPEN) {
                client.close(1000, 'Game ended');
              }
            });
          }, 500);

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
