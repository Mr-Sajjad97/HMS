@echo off
cd /d "%~dp0"
title Al-Hikmat General Hospital ERP (HMS) - Windows Desktop Server
echo ============================================================================
echo   Al-Hikmat General Hospital ERP (HMS) - Windows Desktop Edition
echo   Developed by Sajjad Qaiser Shah
echo   Local Laptop Database Folder: %~dp0data\Laptop_Auto_Backups
echo ============================================================================
echo.

if not exist "node_modules" (
    echo [1/3] First-time setup: Installing required packages (npm install)...
    call npm install
)

echo [2/3] Launching Standalone Windows Desktop App Window...
start "" cmd /c "timeout /t 3 /nobreak >nul & (start msedge --app=http://localhost:3000 --start-maximized 2>nul || start chrome --app=http://localhost:3000 --start-maximized 2>nul || start http://localhost:3000)"

echo [3/3] Starting Hospital ERP Local Server on http://localhost:3000 ...
echo All Bills, Patients, Stock, and History are automatically saved on this Laptop in:
echo   %~dp0data\central_hospital_db.json
echo   %~dp0data\Laptop_Auto_Backups\
echo.
call npm run dev
pause
