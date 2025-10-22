@echo off
echo Starting development servers...
start "Server" cmd /k "cd server && npm run dev:server"
timeout /t 3 /nobreak > nul
start "Client" cmd /k "npm run dev:client"
echo Development servers started!
pause

