@echo off
title DropLAN - PC Desktop Client
color 0A

echo =======================================================
echo          DropLAN - PC Desktop Client
echo =======================================================
echo.

cd /d "%~dp0."

rem Auto-release port 5200 if lingering
call npm run kill:port >nul 2>&1

if not exist "dist" (
    echo Building frontend web assets...
    call npm run build
)

echo Starting DropLAN Native Desktop Window...
npx electron .
