@echo off
echo 🚀 Starting KaragahV2 Server...
echo.

REM Kill any existing node processes
echo 🛑 Stopping existing Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

REM Check if .env exists, if not copy from example
if not exist .env (
    echo 📋 Creating .env file from example...
    copy .env.example .env
)

REM Start the server
echo 🎮 Starting KaragahV2 Detective Game Server...
echo.
echo 📡 Server will be available at: http://localhost:3000
echo 👨‍💼 Admin panel at: http://localhost:3000/admin
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js

pause
