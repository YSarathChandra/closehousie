# Install Java & Android SDK Setup

## 🔧 Quick Setup (Windows)

### Step 1: Install Java 17 LTS

1. **Download Java 17 LTS**
   - Go to: https://www.oracle.com/java/technologies/downloads/
   - Select **"Java 17 LTS"**
   - Download **"x64 Installer" for Windows**

2. **Run the Installer**
   - Double-click the downloaded `.exe` file
   - Follow the installation wizard
   - Accept default location: `C:\Program Files\Java\jdk-17.x.x`

3. **Verify Installation**
   ```powershell
   # Open PowerShell and run:
   java -version
   ```
   Should show: `java version "17.x.x"`

### Step 2: Set JAVA_HOME Environment Variable

1. **Open Environment Variables (Windows 11)**
   - Press `Windows Key + X`
   - Select **"System"**
   - Click **"Advanced system settings"** (on the left)
   - Click **"Environment Variables"** button

2. **Add JAVA_HOME**
   - Click **"New"** (under System variables)
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Java\jdk-17.x.x` (match your installed version)
   - Click **OK**

3. **Update PATH Variable**
   - Find `Path` in System variables
   - Click **"Edit"**
   - Click **"New"**
   - Add: `C:\Program Files\Java\jdk-17.x.x\bin`
   - Click **OK** multiple times to save

4. **Verify in PowerShell**
   ```powershell
   $env:JAVA_HOME
   # Should print: C:\Program Files\Java\jdk-17.x.x
   ```

### Step 3: Install Android Studio (Optional but Recommended)

1. **Download Android Studio**
   - Go to: https://developer.android.com/studio
   - Click **"Download Android Studio"**
   - Accept the license agreement

2. **Run Installer**
   - Double-click the downloaded file
   - Follow the wizard, accept defaults
   - Choose "Standard" installation

3. **During Setup**
   - ✓ Android SDK
   - ✓ Android SDK Platform
   - ✓ Performance (Intel HAXM)

4. **First Launch**
   - Android Studio will download additional SDKs
   - Wait for completion
   - Note the SDK location (usually: `C:\Users\YourName\AppData\Local\Android\sdk`)

### Step 4: Set ANDROID_HOME (Optional)

If using command-line tools:

```powershell
# Set ANDROID_HOME environment variable similarly to JAVA_HOME:
# Variable name: ANDROID_HOME
# Variable value: C:\Users\YourName\AppData\Local\Android\sdk
```

## ✅ Verification Checklist

```powershell
# Run these commands to verify setup:

# Check Java
java -version
# Output: openjdk version "17.x.x"

# Check JAVA_HOME
echo $env:JAVA_HOME
# Output: C:\Program Files\Java\jdk-17.x.x

# Check Gradle wrapper
cd C:\dev\CloseHousie
./gradlew --version
# Output: Gradle 8.5
```

## 🚀 Build Now

Once Java is installed and JAVA_HOME is set:

```powershell
cd C:\dev\CloseHousie
./gradlew assembleDebug

# Output APK:
# app\build\outputs\apk\debug\app-debug.apk
```

## 🐛 Troubleshooting

### Issue: "JAVA_HOME is not set"
- Ensure environment variables were saved
- **Restart PowerShell/Command Prompt** after setting variables
- Verify with: `$env:JAVA_HOME`

### Issue: "Java not found in PATH"
- Check installation directory exists: `C:\Program Files\Java\jdk-17.x.x`
- Verify `bin` folder contains `java.exe`
- Re-add to PATH and restart terminal

### Issue: "Permission denied" on gradlew
```powershell
# Make gradlew executable
icacls "C:\dev\CloseHousie\gradlew" /grant Everyone:F
```

### Issue: "Gradle daemon failed"
```powershell
# Clear gradle cache and retry
cd C:\dev\CloseHousie
./gradlew clean build
```

## ⏱️ Expected Download Times

- Java 17 JDK: ~200 MB (5-10 min)
- Gradle: ~100 MB (2-5 min)
- Android SDK: ~500 MB (10-20 min)
- Dependencies: ~200 MB (5-10 min)
- **First build: 15-30 minutes** (includes downloads)
- **Subsequent builds: 2-3 minutes** (cached)

## Alternative: Use Android Studio GUI

Instead of command line, you can:

1. Open Android Studio
2. File → Open → Select `C:\dev\CloseHousie`
3. Wait for Gradle sync
4. Build → Build APK(s)
5. APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

---

**Next:** After installing Java, run `./gradlew assembleDebug` in PowerShell from `C:\dev\CloseHousie`
