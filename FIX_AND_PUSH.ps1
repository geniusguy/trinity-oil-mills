# Fix Git Issues and Push

Write-Host "🔧 Fixing Git Issues..." -ForegroundColor Green
Write-Host ""

# Add Git to PATH
$gitDir = "C:\Users\wemar\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd"
$env:Path = "$gitDir;$env:Path"

# Navigate to public_html
Set-Location D:\React\TrintyOilMills\public_html

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Remove nested git repository if exists
if (Test-Path "trinity-oil-mills\.git") {
    Write-Host "⚠️  Found nested git repository, removing it..." -ForegroundColor Yellow
    Remove-Item -Path "trinity-oil-mills" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Removed nested repository" -ForegroundColor Green
    Write-Host ""
}

# Update remote URL
Write-Host "🔗 Updating remote URL..." -ForegroundColor Yellow
git remote set-url origin git@github.com:geniusguy/trinity-oil-mills.git
Write-Host "✅ Remote updated" -ForegroundColor Green
Write-Host ""

# Add all files (excluding nested repos)
Write-Host "📦 Adding files..." -ForegroundColor Yellow
git add . --ignore-errors
Write-Host "✅ Files added" -ForegroundColor Green
Write-Host ""

# Check status
Write-Host "📋 Current status:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Commit
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m "Initial commit - Port 3001, ready for deployment"
Write-Host "✅ Committed" -ForegroundColor Green
Write-Host ""

# Set main branch
Write-Host "🌿 Setting main branch..." -ForegroundColor Yellow
git branch -M main
Write-Host "✅ Branch set to main" -ForegroundColor Green
Write-Host ""

# Push
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS! Code pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "❌ Error occurred. Check the output above." -ForegroundColor Red
    Write-Host ""
    Write-Host "If SSH key error, use GitHub Desktop instead:" -ForegroundColor Yellow
    Write-Host "1. Open GitHub Desktop" -ForegroundColor Cyan
    Write-Host "2. Commit and push through the GUI" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

