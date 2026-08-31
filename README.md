# 🚀 TaskFlow - Global State Productivity App

**Modern task management with Web + Android apps. Download directly from the web app.**

## Features

✅ **Web App** - Vite + Vanilla JS  
📱 **Android App** - React Native + Expo  
🎨 **Premium Themes** - Light, Dark, Sepia  
💾 **Local Storage** - No backend needed  
📲 **Download Section** - Install Android from web interface  

## Quick Start

### Users - Web (30 seconds)
```bash
1. Visit https://your-taskflow-site.com
2. Sign up with email/password
3. Create tasks and organize
4. Data saved locally
```

### Users - Android (No APK needed!)
```bash
1. Click "Download App" → Android
2. Select "Install with Expo Go"  
3. Opens Expo app automatically
4. App loads in 30 seconds
```

### Developers (2 minutes)
```bash
git clone <repo>
cd taskflow
npm install && npm run dev
# http://localhost:5173
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Vite + ES Modules |
| Mobile | React Native + Expo |
| Storage | localStorage / AsyncStorage |
| Styling | CSS Variables |
| State | Global object |
| Build | Vite / Expo |

## Files

```
taskflow/
  ├── index.html              # Shell with download section
  ├── src/
  │   ├── main.js             # App logic + Android modal handler
  │   └── style.css           # Themes + download styles
  ├── dist/                   # Built output
  ├── start-dev.sh            # Quick start script
  └── README.md

TaskFlowAndroid/
  ├── App.js                  # React Native complete app
  ├── app.json                # Expo config
  ├── INSTALL.md              # User guide
  └── node_modules/
```

## Download Section Explained

Users click "Download App" → Android in the web app:

### 📱 Install with Expo Go (Recommended)
- Opens Expo Go app
- App loads in 30 seconds
- No download needed
- Instant updates

### 📸 Show QR Code  
- Display QR code
- Scan with Expo Go
- Same result as above

### ⬇️ Build APK (Developers)
- Show build commands
- Use Expo Cloud Build
- Download standalone APK

## Deployment

### Web
```bash
npm run build
# Deploy dist/ to Vercel, Netlify, etc
```

### Android
```bash
cd TaskFlowAndroid
eas build --platform android
# Download APK from EAS
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide.

## Support

- 📖 [Development Guide](./DEPLOYMENT.md)
- 📱 [Android Install](./TaskFlowAndroid/INSTALL.md)
- 🐛 [Report Issues](https://github.com/yourusername/taskflow/issues)
