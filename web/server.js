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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions
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

// Ticket Generation - 3x9 grid, 15 numbers per ticket
function generateTickets(count, playerIndex = 0) {
  const tickets = [];
  const usedNumbers = new Set();

  for (let ticketNum = 0; ticketNum < count; ticketNum++) {
    const ticket = Array(3).fill(null).map(() => Array(9).fill(0));
    const ticketNumbers = new Set();

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

    // Fill 5 numbers per row
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
            const seed = (playerIndex * 1000 + ticketNum * 100 + row * 10 + col) * 7 + attempts;
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
      markedNumbers: []
    });
  }

  return tickets;
}

// Prize Validation - Check if marked numbers are valid AND drawn
function validatePrize(markedNumbers, drawnNumbers, ticket, prizeType, ticketId, player) {
  const markedSet = new Set(markedNumbers);
  const drawnSet = new Set(drawnNumbers);

  // Check if all marked numbers have been drawn
  const allMarkedAreDrawn = markedNumbers.every(n => drawnSet.has(n));
  if (!allMarkedAreDrawn) {
    return { valid: false, reason: 'Not all marked numbers have been drawn' };
  }

  // Check prize requirements
  switch (prizeType) {
    case 'Jaldhi 5':
      if (markedNumbers.length >= 5) {
        return { valid: true };
      }
      return { valid: false, reason: 'Need 5+ marked numbers' };

    case 'Top Line': {
      const topLine = ticket[0].filter(n => n !== 0);
      if (topLine.length > 0 && topLine.every(n => markedSet.has(n))) {
        return { valid: true };
      }
      return { valid: false, reason: 'All top row numbers not marked' };
    }

    case 'Middle Line': {
      const midLine = ticket[1].filter(n => n !== 0);
      if (midLine.length > 0 && midLine.every(n => markedSet.has(n))) {
        return { valid: true };
      }
      return { valid: false, reason: 'All middle row numbers not marked' };
    }

    case 'Bottom Line': {
      const botLine = ticket[2].filter(n => n !== 0);
      if (botLine.length > 0 && botLine.every(n => markedSet.has(n))) {
        return { valid: true };
      }
      return { valid: false, reason: 'All bottom row numbers not marked' };
    }

    case 'Full Housie': {
      const allNums = ticket.flat().filter(n => n !== 0);
      if (allNums.length === 15 && allNums.every(n => markedSet.has(n))) {
        return { valid: true };
      }
      return { valid: false, reason: 'All 15 numbers not marked' };
    }

    case 'Second Full Housie': {
      // Check if player already won Full Housie on this same ticket
      const alreadyWonFullHousieOnThisTicket = player.claimedPrizes.some(p =>
        p.type === 'Full Housie' &&
        player.tickets.some(t => t.id === ticketId && t.id === ticketId)
      );

      // Alternative: Check in ticket itself (better approach)
      const ticketObj = player.tickets.find(t => t.id === ticketId);
      const hasFullHousieOnTicket = ticketObj && ticketObj.markedNumbers &&
        ticketObj.markedNumbers.includes('Full Housie');

      // Simpler: Check if this player already claimed Full Housie on this ticket
      const fullHousieAlreadyClaimed = player.claimedPrizes.some(p => p.type === 'Full Housie');
      if (fullHousieAlreadyClaimed) {
        return { valid: false, reason: '2nd Full Housie not eligible: You already won Full Housie on this ticket' };
      }

      const allNums = ticket.flat().filter(n => n !== 0);
      if (allNums.length === 15 && allNums.every(n => markedSet.has(n))) {
        return { valid: true };
      }
      return { valid: false, reason: 'All 15 numbers not marked' };
    }

    default:
      return { valid: false, reason: 'Unknown prize type' };
  }
}

// Broadcast to game
function broadcastToGame(gameId, message) {
  const msgStr = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.gameId === gameId && client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  });
}

function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getIconForPrize(prizeType) {
  const icons = {
    'Jaldhi 5': '5️⃣',
    'Top Line': '⬆️',
    'Middle Line': '➡️',
    'Bottom Line': '⬇️',
    'Full Housie': '🏆',
    'Second Full Housie': '🥈'
  };
  return icons[prizeType] || '❓';
}

// ============ AUTH ROUTES ============

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
    username: user.username
  });
});

// ============ GAME ROUTES ============

app.get('/api/games', (req, res) => {
  const games = readJSON(GAMES_FILE, []);
  const activeGames = games.filter(g => g.status === 'WAITING' || g.status === 'IN_PROGRESS');
  res.json(activeGames);
});

app.post('/api/games/create', (req, res) => {
  const { userId, username, ticketCount, ticketPrice } = req.body;

  if (!userId || !username || !ticketCount || ticketPrice === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const game = {
    id: uuidv4(),
    joinCode: generateJoinCode(),
    hostId: userId,
    hostName: username,
    ticketPrice,
    prizePool: ticketCount * ticketPrice,
    players: {
      [userId]: {
        id: userId,
        name: username,
        tickets: generateTickets(ticketCount, 0),
        claimedPrizes: []
      }
    },
    drawnNumbers: [],
    status: 'WAITING',
    isDrawing: false,
    prizes: {},
    autoDrawTimer: null,
    createdAt: new Date().toISOString()
  };

  const games = readJSON(GAMES_FILE, []);
  games.push(game);
  writeJSON(GAMES_FILE, games);

  res.json({
    success: true,
    game: {
      id: game.id,
      joinCode: game.joinCode
    }
  });
});

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
    return res.status(400).json({ error: 'Already joined' });
  }

  const playerIndex = Object.keys(game.players).length;
  game.players[userId] = {
    id: userId,
    name: username,
    tickets: generateTickets(ticketCount, playerIndex),
    claimedPrizes: []
  };

  game.prizePool += ticketCount * game.ticketPrice;

  games[games.findIndex(g => g.id === gameId)] = game;
  writeJSON(GAMES_FILE, games);

  res.json({ success: true });
});

app.get('/api/games/:gameId', (req, res) => {
  const games = readJSON(GAMES_FILE, []);
  const game = games.find(g => g.id === req.params.gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json(game);
});

// ============ WEBSOCKET ============

const gameIntervals = {};

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      const { type, gameId, userId } = msg;

      ws.gameId = gameId;
      ws.userId = userId;

      const games = readJSON(GAMES_FILE, []);
      const gameIdx = games.findIndex(g => g.id === gameId);

      if (gameIdx === -1) {
        ws.send(JSON.stringify({ error: 'Game not found' }));
        return;
      }

      const game = games[gameIdx];

      switch (type) {
        case 'JOIN_GAME':
          ws.send(JSON.stringify({ type: 'GAME_STATE', game }));
          break;

        case 'MARK_NUMBER': {
          const { ticketId, number } = msg;
          const player = game.players[userId];

          if (player) {
            const ticket = player.tickets.find(t => t.id === ticketId);
            if (ticket && !ticket.markedNumbers.includes(number)) {
              ticket.markedNumbers.push(number);
            }
          }

          games[gameIdx] = game;
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, {
            type: 'NUMBER_MARKED',
            playerId: userId,
            number
          });
          break;
        }

        case 'START_GAME':
          if (game.hostId !== userId) {
            ws.send(JSON.stringify({ error: 'Only host can start' }));
            return;
          }

          game.status = 'IN_PROGRESS';
          game.isDrawing = true;
          games[gameIdx] = game;
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, { type: 'GAME_STARTED', game });

          // Start auto-draw - only ONE interval per game
          if (gameIntervals[gameId]) clearInterval(gameIntervals[gameId]);

          gameIntervals[gameId] = setInterval(() => {
            const currentGames = readJSON(GAMES_FILE, []);
            const currentGameIdx = currentGames.findIndex(g => g.id === gameId);

            if (currentGameIdx === -1) {
              clearInterval(gameIntervals[gameId]);
              delete gameIntervals[gameId];
              return;
            }

            const currentGame = currentGames[currentGameIdx];

            if (!currentGame.isDrawing || currentGame.status !== 'IN_PROGRESS') {
              return;
            }

            const available = Array.from({ length: 90 }, (_, i) => i + 1)
              .filter(n => !currentGame.drawnNumbers.includes(n));

            if (available.length === 0) {
              clearInterval(gameIntervals[gameId]);
              delete gameIntervals[gameId];
              return;
            }

            const num = available[Math.floor(Math.random() * available.length)];
            currentGame.drawnNumbers.push(num);

            currentGames[currentGameIdx] = currentGame;
            writeJSON(GAMES_FILE, currentGames);

            broadcastToGame(gameId, {
              type: 'NUMBER_DRAWN',
              number: num,
              drawnNumbers: currentGame.drawnNumbers
            });
          }, 3000);
          break;

        case 'CLAIM_PRIZE': {
          const { ticketId, prizeType } = msg;
          const player = game.players[userId];

          if (!player) {
            ws.send(JSON.stringify({ type: 'CLAIM_RESULT', success: false, reason: 'Player not found' }));
            break;
          }

          const ticket = player.tickets.find(t => t.id === ticketId);
          if (!ticket) {
            ws.send(JSON.stringify({ type: 'CLAIM_RESULT', success: false, reason: 'Ticket not found' }));
            break;
          }

          // Validate the prize claim
          const validation = validatePrize(ticket.markedNumbers, game.drawnNumbers, ticket.grid, prizeType, ticketId, player);

          if (!validation.valid) {
            ws.send(JSON.stringify({
              type: 'CLAIM_RESULT',
              success: false,
              reason: validation.reason
            }));
            break;
          }

          // PAUSE drawing immediately on claim attempt
          game.isDrawing = false;

          // Calculate prize amount
          const prizeAmount = (() => {
            switch (prizeType) {
              case 'Jaldhi 5': return Math.floor(game.prizePool * 0.10);
              case 'Top Line':
              case 'Middle Line':
              case 'Bottom Line': return Math.floor(game.prizePool * 0.10);
              case 'Full Housie': return Math.floor(game.prizePool * 0.30);
              case 'Second Full Housie': return Math.floor(game.prizePool * 0.20);
              default: return 0;
            }
          })();

          // Check if someone already won this prize
          if (!game.prizes[prizeType]) {
            // First winner
            game.prizes[prizeType] = {
              winners: [{ playerId: userId, playerName: player.name, amount: prizeAmount }],
              icon: getIconForPrize(prizeType)
            };
          } else {
            // Multiple winners - split amount equally
            const existingWinners = game.prizes[prizeType].winners || [];
            const totalWinners = existingWinners.length + 1;
            const amountPerWinner = Math.floor(prizeAmount / totalWinners);

            game.prizes[prizeType] = {
              winners: [
                ...existingWinners.map(w => ({ ...w, amount: amountPerWinner })),
                { playerId: userId, playerName: player.name, amount: amountPerWinner }
              ],
              icon: getIconForPrize(prizeType)
            };
          }

          // Add to player's claimed prizes
          const playerAmount = game.prizes[prizeType].winners.find(w => w.playerId === userId).amount;
          player.claimedPrizes.push({
            type: prizeType,
            icon: getIconForPrize(prizeType),
            amount: playerAmount
          });

          // Build leaderboard
          const leaderboard = Object.entries(game.players)
            .filter(([_, p]) => p.claimedPrizes.length > 0)
            .map(([_, p]) => ({
              playerName: p.name,
              prizes: p.claimedPrizes,
              totalWinnings: p.claimedPrizes.reduce((sum, pr) => sum + pr.amount, 0)
            }));

          games[gameIdx] = game;
          writeJSON(GAMES_FILE, games);

          // Notify all players of successful claim
          broadcastToGame(gameId, {
            type: 'PRIZE_CLAIMED',
            playerId: userId,
            playerName: player.name,
            prizeType: prizeType,
            prizes: game.prizes,
            leaderboard,
            message: `${player.name} won ${prizeType}!`
          });

          ws.send(JSON.stringify({
            type: 'CLAIM_RESULT',
            success: true,
            prizeType: prizeType,
            amount: playerAmount,
            message: `Congratulations! You won ${prizeType}!`
          }));

          break;
        }

        case 'PAUSE_DRAWING':
          if (game.hostId !== userId) {
            ws.send(JSON.stringify({ error: 'Only host can pause' }));
            return;
          }

          game.isDrawing = false;
          games[gameIdx] = game;
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, { type: 'DRAWING_PAUSED' });
          break;

        case 'RESUME_DRAWING':
          if (game.hostId !== userId) {
            ws.send(JSON.stringify({ error: 'Only host can resume' }));
            return;
          }

          game.isDrawing = true;
          games[gameIdx] = game;
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, { type: 'DRAWING_RESUMED' });

          // Restart auto-draw
          if (gameIntervals[gameId]) clearInterval(gameIntervals[gameId]);

          gameIntervals[gameId] = setInterval(() => {
            const currentGames = readJSON(GAMES_FILE, []);
            const currentGameIdx = currentGames.findIndex(g => g.id === gameId);

            if (currentGameIdx === -1) {
              clearInterval(gameIntervals[gameId]);
              delete gameIntervals[gameId];
              return;
            }

            const currentGame = currentGames[currentGameIdx];

            if (!currentGame.isDrawing || currentGame.status !== 'IN_PROGRESS') {
              return;
            }

            const available = Array.from({ length: 90 }, (_, i) => i + 1)
              .filter(n => !currentGame.drawnNumbers.includes(n));

            if (available.length === 0) {
              clearInterval(gameIntervals[gameId]);
              delete gameIntervals[gameId];
              return;
            }

            const num = available[Math.floor(Math.random() * available.length)];
            currentGame.drawnNumbers.push(num);

            currentGames[currentGameIdx] = currentGame;
            writeJSON(GAMES_FILE, currentGames);

            broadcastToGame(gameId, {
              type: 'NUMBER_DRAWN',
              number: num,
              drawnNumbers: currentGame.drawnNumbers
            });
          }, 3000);
          break;

        case 'END_GAME':
          if (game.hostId !== userId) {
            ws.send(JSON.stringify({ error: 'Only host can end' }));
            return;
          }

          if (gameIntervals[gameId]) {
            clearInterval(gameIntervals[gameId]);
            delete gameIntervals[gameId];
          }

          games.splice(gameIdx, 1);
          writeJSON(GAMES_FILE, games);

          broadcastToGame(gameId, { type: 'GAME_ENDED' });

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
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 CloseHousie Web running on http://localhost:${PORT}`);
});
