# CloseHousie Project Documentation

## Project Overview

CloseHousie is a native Android Tambola (Housie/Bingo) game designed for local network multiplayer. It allows 4-5 players to connect via a 4-digit alphanumeric code over WiFi and play together in real-time.

## Architecture

### MVVM with Dependency Injection

The app follows MVVM architecture with Hilt for dependency injection:

```
UI Layer (Compose)
    ↓
ViewModel Layer (GameViewModel)
    ↓
Repository Layer (GameRepository)
    ↓
Data Layer (NetworkManager, GameEngine)
```

### Core Modules

1. **Domain Layer** (`domain/`)
   - `GameEngine`: Core game logic (ticket generation, win detection)
   - `model`: Data classes for game state

2. **Data Layer** (`data/`)
   - `NetworkManager`: P2P TCP socket communication
   - `GameRepository`: Orchestrates game state and networking

3. **UI Layer** (`ui/`)
   - `GameViewModel`: Exposes reactive state via StateFlow
   - `screens`: Compose UI for different game states

4. **DI** (`di/`)
   - `AppModule`: Hilt configuration for dependency injection

## Technical Details

### Networking

- **Protocol**: TCP/IP with JSON serialization
- **Port**: 9999 (configurable)
- **Connection Model**: 
  - Host acts as ServerSocket
  - Players connect as clients
  - Messages broadcast to all connected peers

### Game Logic

- **Ticket Generation**: Deterministic based on player index (ensures no duplicates)
- **Win Detection**: 
  - Single Line: 5+ consecutive numbers marked
  - Two Line: 10+ consecutive numbers marked
  - Full House: 13+ out of 15 numbers marked
- **State Management**: Centralized in GameRepository, updates via StateFlow

### UI Framework

- **Compose**: Modern declarative UI
- **Material 3**: Material Design components
- **State Management**: MutableStateFlow → StateFlow for reactive updates

## Build & Deployment

### Build Command
```bash
./gradlew assembleDebug
```

### Output
`app/build/outputs/apk/debug/app-debug.apk`

### Requirements
- Min SDK: 26 (Android 8.0)
- Target SDK: 34 (Android 14)
- 64-bit support required

## Key Decision Points

1. **Raw TCP vs WebSocket**: Chose raw TCP for minimal overhead and direct control
2. **JSON Serialization**: Simple text-based for easy debugging
3. **Local-Only**: No cloud backend to keep data private
4. **Deterministic Tickets**: Based on seed to ensure uniqueness without server

## Known Limitations

1. No internet play (local WiFi only)
2. No automatic host failover if host device crashes
3. No transaction verification (early MVP)
4. Limited to 10 concurrent players
5. No persistent game history yet

## Future Enhancements

- Cloud sync for game history
- Blockchain-style transaction verification
- Web-based admin panel for monitoring
- Tournament mode with multiple rounds
- Mobile-web version for broader reach

## Testing Strategy

- Unit tests for GameEngine logic
- Integration tests for NetworkManager
- Manual testing on physical devices
- Network resilience testing (WiFi drops, reconnects)

## Security Considerations

Current MVP priorities:
1. All communication is local (no external internet)
2. No user authentication required
3. No sensitive data storage
4. Future: Add transaction signing and verification

## Development Guidelines

1. Keep components focused and single-responsibility
2. Use StateFlow for reactive UI updates
3. Handle coroutine cancellation properly
4. Test networking edge cases (disconnects, timeouts)
5. Keep game logic decoupled from networking

## Debugging

- Enable Timber logging for debugging
- Use Android Studio's Network Inspector for traffic analysis
- Test with Android Emulator + real device for network scenarios

## Performance Targets

- Game state sync: < 100ms
- Number draw broadcast: < 50ms
- UI responsiveness: 60 FPS
- Memory footprint: < 100MB
- Battery drain: Minimal (socket listening only)

## Play Store Requirements

- Min API 26 tested
- Privacy policy for local data handling
- Permissions: INTERNET, ACCESS_NETWORK_STATE, CHANGE_WIFI_MULTICAST_STATE
- Content rating: General audiences
- No external analytics required (local only)

## Contact & Support

For issues related to:
- Game logic: See GameEngine.kt
- Networking: See NetworkManager.kt
- UI: See screens/ directory
- State management: See GameViewModel.kt
