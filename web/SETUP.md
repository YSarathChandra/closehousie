# CloseHousie Web - Setup & Run Guide

## 📋 Complete Setup Instructions

### Step 1: Install Node.js (One-time)

1. **Download Node.js LTS**
   - Go to: https://nodejs.org/
   - Click "LTS" (Long Term Support)
   - Download Windows Installer

2. **Run Installer**
   - Double-click the downloaded file
   - Accept license agreement
   - Install with default settings
   - Check "Add to PATH" checkbox

3. **Verify Installation**
   ```powershell
   node --version
   npm --version
   ```
   Should show: `v18.x.x` or higher

### Step 2: Setup CloseHousie Web

1. **Navigate to Web Directory**
   ```powershell
   cd C:\dev\CloseHousie\web
   ```

2. **Install Dependencies** (First time only)
   ```powershell
   npm install
   ```
   This will download and install:
   - express (web server)
   - ws (websocket library)
   - bcryptjs (password hashing)
   - uuid (unique IDs)
   - cors (cross-origin)

3. **Create Data Directory** (Optional - auto-created)
   ```powershell
   mkdir data
   ```

### Step 3: Start the Server

```powershell
npm start
```

You should see:
```
🎮 CloseHousie Web running on http://localhost:3000
📊 Admin panel: http://localhost:3000/admin
🎲 Game page: http://localhost:3000/game
```

## 🌐 Access the Application

Open your web browser and go to:

| Page | URL | Purpose |
|------|-----|---------|
| **Signup/Login** | http://localhost:3000 | Create or login account |
| **Play** | http://localhost:3000/game.html | Play games (after login) |
| **Admin** | http://localhost:3000/admin.html | Manage games (admins only) |

## 🎮 Test the Game Locally

### Test with Multiple Tabs

1. **Tab 1 - Create Game**
   - Go to http://localhost:3000
   - Sign up with username: `player1`
   - Click "Create Game"
   - Note the 4-digit code (e.g., "A7K2")

2. **Tab 2 - Join Game**
   - Go to http://localhost:3000
   - Sign up with username: `player2`
   - Find the game with code `A7K2`
   - Click on it to join

3. **Tab 1 - Start Game**
   - Click "Start Game"
   - You (player1) are the host

4. **Both Tabs**
   - Tab 1: Click "Draw" to draw numbers
   - Tab 2: Click numbers on your ticket to mark them
   - Tab 2: Click "Claim Win" when you get 5+ numbers

## 🛠️ Development Mode (Auto-reload)

For development with auto-restart on file changes:

```powershell
npm run dev
```

Install nodemon first:
```powershell
npm install --save-dev nodemon
```

## 📝 Default Admin Account

To make someone an admin, edit `data/users.json`:

```json
{
  "id": "...",
  "username": "admin",
  "email": "admin@example.com",
  "password": "...",
  "isAdmin": true,
  "createdAt": "..."
}
```

## 🔄 Data Persistence

Data is stored in JSON files:
- `data/users.json` - All user accounts
- `data/games.json` - All games (current and completed)

To reset data, simply delete these files. They'll be recreated on restart.

## 🌍 Access from Other Devices

To allow other computers/phones to join:

1. **Get Your Computer's IP**
   ```powershell
   ipconfig
   # Look for "IPv4 Address" under WiFi adapter
   # Example: 192.168.1.100
   ```

2. **Share This URL**
   ```
   http://192.168.1.100:3000
   ```

3. **Make Sure Firewall Allows Port 3000**
   - Windows Defender Firewall → Allow an app through firewall
   - Find Node.js or add port 3000

## 🐛 Troubleshooting

### Error: "npm not found"
- Node.js not installed properly
- Restart PowerShell after installing Node.js
- Verify: `npm --version`

### Error: "Port 3000 already in use"
```powershell
# Use different port
$env:PORT=3001
npm start
```

Or find what's using port 3000:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Error: "Cannot find module 'express'"
```powershell
# Reinstall dependencies
rm -r node_modules
npm install
```

### WebSocket won't connect
- Check firewall allows websockets
- Try different port: `$env:PORT=3001`
- Check browser console (F12) for errors

### Data not saving
- Check `data/` directory exists
- Verify write permissions in web folder
- Check disk space available

### Game won't sync between tabs
- Hard refresh browser: Ctrl+Shift+R
- Check browser console for errors
- Ensure websocket is connected
- Try different browser (Chrome/Firefox)

## 🚀 Performance Tips

### Optimize Server
```powershell
# Run with clustering (uses all CPU cores)
# Add to server.js:
# const cluster = require('cluster');
# if (cluster.isMaster) { ... }
```

### Clear Old Data
```powershell
# Delete completed games from data/games.json
# Keep only recent games for better performance
```

### Monitor Server
```powershell
# Check memory usage
Get-Process node

# Check network connections
netstat -ano | findstr node
```

## 🔒 Security Best Practices

### For Local Development (Safe)
- Default settings are fine
- Data stored locally in JSON

### For Production (Before Public Deploy)
1. Set strong session secrets
2. Use HTTPS/SSL certificates
3. Move to database (MongoDB/PostgreSQL)
4. Add rate limiting
5. Sanitize all inputs
6. Enable CORS for specific domains
7. Use environment variables for secrets
8. Add authentication tokens

## 📦 Package Versions

```json
{
  "express": "^4.18.2",        // Web server
  "ws": "^8.14.0",             // WebSocket
  "uuid": "^9.0.0",            // Generate IDs
  "bcryptjs": "^2.4.3",        // Password hashing
  "cors": "^2.8.5"             // Cross-origin
}
```

## ✅ Verification Checklist

Before playing:

- [ ] Node.js installed (`node --version`)
- [ ] In web directory (`cd web`)
- [ ] Dependencies installed (`npm list`)
- [ ] Server running (`npm start`)
- [ ] Can access http://localhost:3000
- [ ] Can sign up and login
- [ ] Can create games
- [ ] Can join games
- [ ] WebSocket connected (check browser console)
- [ ] Real-time updates work

## 🆘 Getting Help

### Check Server Output
```
npm start
# Look for error messages
```

### Check Browser Console
1. Press F12 in browser
2. Click "Console" tab
3. Look for red error messages
4. Copy-paste the error

### Check Network
1. Press F12 in browser
2. Click "Network" tab
3. Look for WebSocket connection
4. Check if it says "101 Switching Protocols"

### Test Connectivity
```powershell
# Test if server is running
curl http://localhost:3000

# If it shows HTML, server is working
```

## 📚 Next Steps

After successful setup:

1. ✅ Open http://localhost:3000
2. ✅ Create an account
3. ✅ Create a game
4. ✅ Invite friends to join
5. ✅ Play and have fun!

---

**If you need help:** Check troubleshooting section or review server console output.
