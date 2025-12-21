# Git Push Script - PowerShell
# This script adds Git to PATH and pushes your code

Write-Host "🚀 Git Push Script" -ForegroundColor Green
Write-Host ""

# Add Git to PATH
$env:Path += ";C:\Program Files\Git\cmd"

# Navigate to public_html
Set-Location D:\React\TrintyOilMills\public_html

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Check if remote exists
$remote = git remote -v 2>&1
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($remote)) {
    Write-Host "Adding remote repository..." -ForegroundColor Yellow
    git remote add origin git@github.com:geniusguy/trinity-oil-mills.git
} else {
    Write-Host "Remote already configured:" -ForegroundColor Green
    Write-Host $remote
    Write-Host ""
    Write-Host "Updating remote URL..." -ForegroundColor Yellow
    git remote set-url origin git@github.com:geniusguy/trinity-oil-mills.git
}

Write-Host ""
Write-Host "Adding all files..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m "Initial commit - Port 3001, ready for deployment"

Write-Host ""
Write-Host "Setting main branch..." -ForegroundColor Yellow
git branch -M main

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "❌ Error occurred. Check the output above." -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

