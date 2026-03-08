# WorkAgent Setup Script for Windows
# Checks prerequisites and installs dependencies

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WorkAgent Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[!] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "    Please install Node.js >= 18 from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "    Or use: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    Write-Host ""
    
    $install = Read-Host "Attempt to install via winget? (y/n)"
    if ($install -eq 'y') {
        Write-Host "Installing Node.js LTS via winget..." -ForegroundColor Yellow
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        Write-Host "Please restart your terminal and run this script again." -ForegroundColor Green
        exit 0
    }
    exit 1
}

$nodeVersion = (node --version)
Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green

# Check npm
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Host "[!] npm is not found. It should come with Node.js." -ForegroundColor Red
    exit 1
}
$npmVersion = (npm --version)
Write-Host "[OK] npm v$npmVersion" -ForegroundColor Green

# Check Cursor CLI
$cursorCmd = Get-Command cursor -ErrorAction SilentlyContinue
if ($cursorCmd) {
    Write-Host "[OK] Cursor CLI found" -ForegroundColor Green
} else {
    Write-Host "[!] Cursor CLI not found (optional for development)" -ForegroundColor Yellow
    Write-Host "    Agent features will use fallback mode" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan

# Install root dependencies
Set-Location $PSScriptRoot\..
npm install

# Install server dependencies
Write-Host "Installing server dependencies..." -ForegroundColor Cyan
Set-Location server
npm install

# Install client dependencies
Write-Host "Installing client dependencies..." -ForegroundColor Cyan
Set-Location ..\client
npm install

Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the development server:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "This will start:" -ForegroundColor Cyan
Write-Host "  - Backend API at http://localhost:3001" -ForegroundColor White
Write-Host "  - Frontend UI at http://localhost:5173" -ForegroundColor White
Write-Host ""
