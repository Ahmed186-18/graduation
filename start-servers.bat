@echo off
echo Starting Solace Lens Development Servers...
echo.

echo Starting Backend Server (Port 4000)...
start "Backend Server" cmd /k "cd server && npm run dev:server"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server (Port 8080)...
start "Frontend Server" cmd /k "npm run dev:client"

echo.
echo ========================================
echo Servers are starting...
echo.
echo Backend API: http://localhost:4000
echo Frontend App: http://localhost:8080
echo.
echo Wait for both servers to fully start,
echo then go to: http://localhost:8080
echo ========================================
echo.
pause

