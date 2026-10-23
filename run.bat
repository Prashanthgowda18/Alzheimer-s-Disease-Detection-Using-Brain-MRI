@echo off
title Alzheimer App Runner
echo ===================================================
echo  Starting Alzheimer Disease Detection System
echo ===================================================
echo.
echo [1/2] Starting PyTorch ResNet50 ML Backend (Port 5000)...
start "Alzheimer ML Backend (Flask)" python app.py

echo [2/2] Starting Frontend Web Server (Port 3000)...
npm run dev
