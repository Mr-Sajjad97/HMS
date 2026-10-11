@echo off
cd /d "%~dp0"
title Create Windows Desktop Shortcut - Al-Hikmat Hospital ERP
echo ============================================================================
echo   Creating Windows Desktop Icon for Al-Hikmat Hospital ERP (HMS)...
echo ============================================================================

set "TARGET_BAT=%~dp0START_SERVER_WINDOWS.bat"
set "WORKING_DIR=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$DesktopPath = [Environment]::GetFolderPath('Desktop'); " ^
  "$Shortcut = $WshShell.CreateShortcut((Join-Path $DesktopPath 'Al-Hikmat Hospital ERP.lnk')); " ^
  "$Shortcut.TargetPath = '%TARGET_BAT%'; " ^
  "$Shortcut.WorkingDirectory = '%WORKING_DIR%'; " ^
  "$Shortcut.WindowStyle = 7; " ^
  "$Shortcut.Description = 'Al-Hikmat General Hospital ERP - Desktop Software'; " ^
  "$Shortcut.IconLocation = 'shell32.dll,23'; " ^
  "$Shortcut.Save();"

echo.
echo [SUCCESS] Desktop Icon "Al-Hikmat Hospital ERP" has been created on your Windows Desktop!
echo Double-click "Al-Hikmat Hospital ERP" on your Desktop anytime to open the software in a Desktop Window.
echo.
pause
