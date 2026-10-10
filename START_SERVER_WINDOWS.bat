@echo off
title Al-Hikmat General Hospital ERP (HMS) - Developed by Sajjad Qaiser Shah
echo ============================================================================
echo   Al-Hikmat General Hospital ERP (HMS)
echo   Developed by Sajjad Qaiser Shah
echo   Central Local Server Launcher (Port 3000)
echo ============================================================================
echo.

if not exist "node_modules" (
    echo [1/2] First-time setup: Installing required packages (npm install)...
    call npm install
)

echo [2/2] Starting Hospital ERP Server on http://localhost:3000 ...
echo Open your browser and go to: http://localhost:3000
echo.
call npm run dev
pause
