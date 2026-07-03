# CloseHousie - Tambola Game for Local Network

A real-time multiplayer Tambola (Housie/Bingo) game for Android that allows 4-5 players to connect over local WiFi network using a simple 4-digit alphanumeric code.

## Features

- **Local Network Play**: Connect multiple players over WiFi without internet
- **Simple Join Code**: Use a 4-digit alphanumeric code to join games
- **Real-time Gameplay**: Draw numbers, mark tickets, and claim wins instantly
- **Host & Player Roles**: One player hosts the game, others join
- **Automatic Ticket Generation**: Each player gets a unique ticket (15 numbers from 1-90)
- **Win Detection**: Automatic detection of single line, two line, and full house wins

## Architecture

### Tech Stack
- **Language**: Kotlin
- **UI Framework**: Jetpack Compose
- **Database**: Room (for future enhancements)
- **Networking**: Raw TCP Sockets over WiFi
- **DI**: Hilt
- **Async**: Kotlin Coroutines

### Key Components

1. **GameEngine** - Core game logic
   - Ticket generation (deterministic, no duplicates)
   - Win detection (lines, full house)
   - Number drawing

2. **NetworkManager** - P2P Connectivity
   - Server mode (for hosts)
   - Client mode (for joiners)
   - Message broadcasting
   - Local network discovery

3. **GameRepository** - Game State Management
   - Manages game lifecycle
   - Handles player joins
   - Broadcasts game events
   - Tracks marked numbers

4. **GameViewModel** - UI State
   - Exposes game state to UI
   - Handles user interactions
   - Updates in real-time

5. **Compose UI** - Modern Android UI
   - Home screen with game options
   - Game board with live number display
   - Ticket display with tap-to-mark
   - Player list and game status

## Building the APK

### Prerequisites
- Android Studio with Gradle
- Minimum SDK: Android 8.0 (API 26)
- Target SDK: Android 14 (API 34)

### Build Steps

```bash
# 1. Clone/Navigate to project
cd C:\dev\CloseHousie

# 2. Build the project
./gradlew build

# 3. Create release APK
./gradlew assembleRelease

# 4. Or create debug APK
./gradlew assembleDebug
```

APK will be generated at: `app/build/outputs/apk/debug/app-debug.apk` or `app/build/outputs/apk/release/app-release.apk`

## Running the App

### Setup Instructions

1. **Install APK on 5 Android Devices** (Min API 26)
   - All devices must be on the same WiFi network
   - Ensure WiFi is enabled

2. **Device 1 - Create Game**
   - Open app → "CREATE GAME"
   - Enter your name
   - Note the join code displayed (e.g., "A7K2")
   - Tap "START" when all players have joined

3. **Devices 2-5 - Join Game**
   - Open app → "JOIN GAME"
   - Enter your name
   - Enter the 4-digit code shown on host's screen
   - Enter host's IP address (shown on host device or check WiFi settings)
   - Tap "JOIN GAME"

4. **During Game**
   - Host: Tap "DRAW" to draw a number each turn
   - All Players: Tap numbers on your ticket to mark them
   - Players: Tap "CLAIM" when you get a line or full house
   - Host: Tap "END" to finish the game

## Game Modes

- **Single Line**: Any 5 consecutive marked numbers across the ticket
- **Two Lines**: Any 10 consecutive marked numbers
- **Full House**: All 15 numbers marked on the ticket

## Network Details

- **Protocol**: TCP/IP with JSON message serialization
- **Default Port**: 9999
- **Connection**: Direct peer-to-peer (no server required)
- **Bandwidth**: ~1-5 KB per message
- **Latency**: < 200ms on typical WiFi

## Troubleshooting

### Can't Connect to Host
- Ensure both devices are on same WiFi network
- Check firewall settings (allow port 9999)
- Verify host IP address is correct
- Restart WiFi on both devices

### Numbers Not Syncing
- Check WiFi signal strength
- Restart the game
- Ensure all devices stay connected to WiFi

### App Crashes
- Update to latest Android version
- Clear app cache and data
- Reinstall APK

## Security Notes

- All communication is local (no data leaves your network)
- No user accounts or passwords required
- No tracking or analytics
- Virtual currency is local to each device

## Future Enhancements

- Cloud backup and sync
- Leaderboards
- Game history and statistics
- Multiple game modes
- Themed tickets
- Sound effects and animations

## Development

### Project Structure
```
CloseHousie/
├── app/
│   ├── src/main/java/com/closehousie/
│   │   ├── domain/          # Business logic
│   │   ├── data/            # Data sources and networking
│   │   ├── ui/              # Compose screens and ViewModels
│   │   └── di/              # Dependency injection
│   ├── res/                 # Resources
│   └── build.gradle.kts     # App dependencies
└── build.gradle.kts         # Root config
```

### Key Files
- `GameEngine.kt` - Core game logic
- `NetworkManager.kt` - P2P networking
- `GameRepository.kt` - Game state management
- `GameViewModel.kt` - UI state
- `MainActivity.kt` - Entry point

## Testing

```bash
# Run unit tests
./gradlew test

# Run instrumentation tests on emulator
./gradlew connectedAndroidTest
```

## License

MIT License - Feel free to modify and distribute

## Support

For issues or questions, please create an issue in the repository or contact the development team.

---

**Note**: This is an MVP version optimized for local network play. Production deployment would require additional security measures, backup systems, and compliance testing.
