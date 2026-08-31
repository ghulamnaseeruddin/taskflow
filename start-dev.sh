#!/bin/bash

# TaskFlow - Development Start Script
# Runs both web and Android dev servers

echo "🚀 TaskFlow Development Environment"
echo "===================================="
echo ""

# Check if running from correct directory
if [ ! -f "index.html" ]; then
  echo "❌ Error: Run this script from /taskflow directory"
  exit 1
fi

# Start web app
echo "📱 Starting Web App (port 5173)..."
npm run dev &
WEB_PID=$!

echo ""
echo "🤖 Starting Android Dev Server..."
cd ../TaskFlowAndroid && npx expo start &
ANDROID_PID=$!

echo ""
echo "✅ Both servers running!"
echo ""
echo "📲 Web App:   http://localhost:5173"
echo "🤖 Android:   Press 'a' in terminal to open in Android emulator"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $WEB_PID $ANDROID_PID
