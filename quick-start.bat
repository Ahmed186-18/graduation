@echo off
title Solace Lens - Quick Start
color 0A

echo.
echo ===============================================
echo           SOLACE LENS - QUICK START
echo ===============================================
echo.

echo [1/3] Starting Backend Server...
start "Backend" cmd /k "cd server && echo Backend Server Starting... && npm run dev:server"

echo [2/3] Waiting for backend to initialize...
timeout /t 8 /nobreak > nul

echo [3/3] Starting Frontend Server...
start "Frontend" cmd /k "echo Frontend Server Starting... && npm run dev:client"

echo.
echo ===============================================
echo           SERVERS ARE STARTING...
echo ===============================================
echo.
echo Backend API:  http://localhost:4000
echo Frontend App: http://localhost:8080
echo.
echo Wait 10-15 seconds, then open:
echo http://localhost:8080
echo.
echo ===============================================
echo.
echo Press any key to open the application...
pause > nul

echo Opening http://localhost:8080...
start http://localhost:8080

echo.
echo If the page doesn't load, wait a few more seconds
echo and manually go to: http://localhost:8080
echo.
pause

