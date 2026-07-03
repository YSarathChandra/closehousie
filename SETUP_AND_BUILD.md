# CloseHousie - Setup and Build Guide

## Quick Start (5 Minutes)

### Prerequisites

Before building, ensure you have installed:

1. **Java Development Kit (JDK) 17+**
   - Download from: https://www.oracle.com/java/technologies/downloads/
   - Verify: `java -version` in command prompt

2. **Android Studio** (Latest version)
   - Download from: https://developer.android.com/studio
   - During installation, select "Android SDK" components
   - Ensure SDK Platform for API 34 is installed

3. **Gradle 8.5+** (Usually comes with Android Studio)

### Environment Setup

```bash
# Set JAVA_HOME (Windows)
setx JAVA_HOME "C:\Program Files\Java\jdk-17"

# Set ANDROID_HOME (Windows)
setx ANDROID_HOME "C:\Users\YourUsername\AppData\Local\Android\sdk"

# Verify installations
java -version
gradle --version
```

## Building the APK

### Method 1: Using Android Studio (Recommended)

1. **Open Project in Android Studio**
   - File → Open → Select `C:\dev\CloseHousie`
   - Wait for Gradle sync to complete

2. **Build Debug APK**
   - Menu: Build → Build Bundle(s) / APK(s) → Build APK(s)
   - Or use shortcut: `Ctrl+Alt+Shift+G`

3. **Locate Generated APK**
   - Path: `app/build/outputs/apk/debug/app-debug.apk`
   - Or: `app/build/outputs/apk/release/app-release.apk`

4. **Install on Device/Emulator**
   - Connect Android device via USB (or start emulator)
   - Drag APK onto connected device or:
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

### Method 2: Using Command Line

```bash
# Navigate to project root
cd C:\dev\CloseHousie

# Build debug APK
./gradlew assembleDebug

# APK output: app\build\outputs\apk\debug\app-debug.apk

# Or build release APK (requires signing)
./gradlew assembleRelease

# Install on connected device
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Method 3: Using Gradle Wrapper (Recommended for CI/CD)

```bash
# On Windows
gradlew.bat assembleDebug

# On Mac/Linux
./gradlew assembleDebug
```

## Installation on Devices

### Via ADB (Android Debug Bridge)

```bash
# List connected devices
adb devices

# Install on device
adb install app/build/outputs/apk/debug/app-debug.apk

# Uninstall
adb uninstall com.closehousie

# Install on specific device (if multiple)
adb -s <device_id> install app/build/outputs/apk/debug/app-debug.apk
```

### Manually (Without ADB)

1. Enable USB Debugging on Android Device
   - Settings → Developer Options → USB Debugging
   - Connect to PC via USB

2. Allow Unknown Sources
   - Settings → Apps & Notifications → Advanced → Special app access → Install unknown apps

3. Copy APK to Device
   - Transfer `app-debug.apk` to device
   - Use file manager to locate and open
   - Tap Install when prompted

## Testing the Game

### Network Setup

1. **Connect All Devices to Same WiFi Network**
   - All 5 devices must be on same WiFi
   - Note: 2.4GHz WiFi works better than 5GHz for local network

2. **Disable Mobile Data (Optional)**
   - Toggle off mobile data to force WiFi usage
   - Ensures all traffic goes through WiFi

3. **Note Host Device IP Address**
   - Settings → WiFi → Connected Network → IP address
   - Example: 192.168.1.105

### Running the Game

**Device 1 (Host):**
```
1. Open CloseHousie app
2. Tap "CREATE GAME"
3. Enter your name (e.g., "Host Player")
4. Wait for join code and IP to display
5. Share 4-digit code (e.g., "A7K2") with other players
6. Share your IP address when asked
7. Wait for all players to join (you'll see a list)
8. Tap "START" to begin game
9. Tap "DRAW" to draw numbers each turn
10. Tap "END" to finish game
```

**Devices 2-5 (Players):**
```
1. Open CloseHousie app
2. Tap "JOIN GAME"
3. Enter your name
4. Enter 4-digit code from host (e.g., "A7K2")
5. Enter host's IP address (e.g., "192.168.1.105")
6. Tap "JOIN GAME"
7. Wait for host to start
8. When game starts, tap numbers on your ticket to mark them
9. When you complete a line/full house, tap "CLAIM"
```

## Troubleshooting Build Issues

### Issue: "Gradle daemon not available" or Gradle won't start

**Solution:**
```bash
# Clear gradle cache
./gradlew clean

# Try again
./gradlew assembleDebug
```

### Issue: "JAVA_HOME not set"

**Solution:**
```bash
# Set JAVA_HOME temporarily (Windows)
set JAVA_HOME=C:\Program Files\Java\jdk-17

# Or set permanently
setx JAVA_HOME "C:\Program Files\Java\jdk-17"
```

### Issue: "Android SDK not found"

**Solution:**
```bash
# Set ANDROID_HOME
setx ANDROID_HOME "C:\Users\<YourUsername>\AppData\Local\Android\sdk"

# Or in Android Studio:
# - File → Settings → Appearance & Behavior → System Settings → Android SDK
# - Check SDK path
```

### Issue: "Could not download gradle wrapper"

**Solution:**
```bash
# Download gradle manually from https://gradle.org/releases/
# Extract to gradle\wrapper\gradle-8.5-bin.zip

# Or use the local gradle
gradle assembleDebug
```

### Issue: "Compilation errors" or "Symbol not found"

**Solution:**
```bash
# Clean and rebuild
./gradlew clean build

# Or in Android Studio:
# - Build → Clean Project
# - Build → Rebuild Project
```

## Troubleshooting Network Issues

### Can't Find Host Device

1. Check both devices on same WiFi
   ```bash
   # On Windows: ipconfig
   # On Mac: ifconfig
   # Check subnet matches (e.g., 192.168.1.x)
   ```

2. Disable WiFi sleep
   - Settings → WiFi → Advanced → WiFi Sleep Policy → Never

3. Restart WiFi router

### Connection Timeout

1. Verify host IP is correct
   - Re-enter IP carefully on joining device

2. Check firewall
   - Windows Firewall → Allow app through → Check Java/Gradle

3. Restart app on both devices

### Numbers Not Syncing

1. Check WiFi signal strength (should be > -70 dBm)
2. Move devices closer to router
3. Restart the game
4. Try 2.4GHz WiFi if using 5GHz

## Advanced Build Options

### Release Build (for Play Store)

```bash
# Generate release APK (requires signing)
./gradlew assembleRelease

# Build with custom version
./gradlew assembleDebug -Pversion_code=2 -Pversion_name="1.1.0"
```

### Create App Bundle (for Play Store)

```bash
# Generate AAB (Android App Bundle)
./gradlew bundleRelease
```

### Run Tests

```bash
# Unit tests
./gradlew test

# Instrumentation tests
./gradlew connectedAndroidTest
```

### View Gradle Tasks

```bash
# List all available tasks
./gradlew tasks

# List all tasks with details
./gradlew tasks --all
```

## Performance Tips

1. **Use Emulator Wisely**
   - Emulator is slower; test on real device for networking
   - Use "Google APIs" image, not "Google Play"

2. **Optimize Build Time**
   ```bash
   # Enable parallel builds
   ./gradlew assembleDebug --parallel
   
   # Build only changed modules
   ./gradlew assemble --build-cache
   ```

3. **Reduce APK Size**
   - Use `assembleRelease` instead of `assembleDebug`
   - Enable ProGuard minification in `app/build.gradle.kts`

## Next Steps

After successful build:

1. ✅ Install APK on 5 devices
2. ✅ Connect all to same WiFi
3. ✅ Run a test game
4. ✅ Report issues or improvements

## Support

- **Build Issues?** Check Android Studio's Logcat
- **Network Issues?** Check WiFi connectivity first
- **App Crashes?** Enable USB Debugging and check ADB logcat:
  ```bash
  adb logcat | grep CloseHousie
  ```

---

**Happy Gaming!** 🎉
