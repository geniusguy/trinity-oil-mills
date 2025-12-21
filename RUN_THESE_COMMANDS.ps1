# Run These Commands - Copy and Paste Entire Script

Write-Host "🔧 Setting up Git..." -ForegroundColor Green

# Find Git from GitHub Desktop
$gitPaths = Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($gitPaths) {
    $gitDir = Split-Path $gitPaths.FullName
    $env:Path = "$gitDir;$env:Path"
    Write-Host "✅ Git added to PATH: $gitDir" -ForegroundColor Green
} else {
    # Try standard Git installation
    if (Test-Path "C:\Program Files\Git\cmd") {
        $env:Path = "C:\Program Files\Git\cmd;$env:Path"
        Write-Host "✅ Git added to PATH: C:\Program Files\Git\cmd" -ForegroundColor Green
    } else {
        Write-Host "❌ Git not found. Please install Git or use GitHub Desktop." -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "Testing Git..." -ForegroundColor Yellow
git --version

Write-Host ""
Write-Host "📁 Navigating to public_html..." -ForegroundColor Yellow
Set-Location D:\React\TrintyOilMills\public_html

Write-Host ""
Write-Host "🔗 Adding remote repository..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin git@github.com:geniusguy/trinity-oil-mills.git
Write-Host "✅ Remote added" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Adding all files..." -ForegroundColor Yellow
git add .
Write-Host "✅ Files added" -ForegroundColor Green

Write-Host ""
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m "Initial commit - Port 3001, ready for deployment"
Write-Host "✅ Committed" -ForegroundColor Green

Write-Host ""
Write-Host "🌿 Setting main branch..." -ForegroundColor Yellow
git branch -M main
Write-Host "✅ Branch set" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS! Code pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "❌ Error occurred. Check SSH key or use GitHub Desktop instead." -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

