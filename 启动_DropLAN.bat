@echo off
title DropLAN - Local LAN Transfer
color 0A

echo =======================================================
echo          DropLAN - Local LAN Instant Transfer
echo =======================================================
echo.

cd /d "%~dp0."

rem Auto-release port 5200 if lingering
call npm run kill:port >nul 2>&1

if not exist "node_modules" (
    echo [1/2] Installing dependencies, please wait...
    call npm install
)

if not exist "dist" (
    echo [2/2] Building frontend web assets...
    call npm run build
)

echo.
echo Launching DropLAN local server and opening browser...
start "" "http://localhost:5200"

node server/index.js

pause