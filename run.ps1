Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Starting Alzheimer Disease Detection System" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "[1/2] Launching PyTorch ResNet50 ML Backend (Port 5000)..." -ForegroundColor Yellow
Start-Process python -ArgumentList "app.py"
Write-Host "[2/2] Starting Frontend Web Server (Port 3000)..." -ForegroundColor Green
npm run dev
