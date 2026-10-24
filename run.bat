@echo off
cd /d "%~dp0"
title Alzheimer App Runner
echo ===================================================
echo  Starting Alzheimer Disease Detection System
echo ===================================================
echo.
echo [1/2] Starting PyTorch ResNet50 ML Backend (Port 5000)...
start "Alzheimer ML Backend (Flask)" /d "%~dp0" python app.py

REM Wait for backend health endpoint to become available (max 30 seconds)
set /a attempts=0
:waitloop
timeout /t 2 /nobreak >nul
set /a attempts+=1
powershell -Command "try { $r = Invoke-WebRequest -Uri http://127.0.0.1:5000/health -UseBasicParsing; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 goto backend_ready
if %attempts% geq 15 (
  echo Backend failed to start after %attempts% attempts. Continuing anyway.
  goto backend_ready
)
goto waitloop
:backend_ready

echo [2/2] Starting Frontend Web Server (Port 3000)...
npm run dev
