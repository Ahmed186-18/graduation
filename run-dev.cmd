@echo off
title Solace Lens Development
echo ========================================
echo    Solace Lens Development Server
echo ========================================
echo.

echo Starting backend server...
start "Backend Server" cmd /k "cd server && npm run dev:server"

echo Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo Starting frontend server...
start "Frontend Server" cmd /k "npm run dev:client"

echo.
echo ========================================
echo Both servers are starting...
echo Backend: http://localhost:4000
echo Frontend: http://localhost:8080
echo ========================================
echo.
echo Press any key to exit...
pause > nul

