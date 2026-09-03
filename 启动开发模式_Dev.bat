@echo off
title DropLAN - Dev Mode
color 0B

echo =======================================================
echo          DropLAN - Developer Mode (Vite + Server)
echo =======================================================
echo.

cd /d "%~dp0."

echo Starting Vite HMR and Backend concurrently...
npm run dev

pause