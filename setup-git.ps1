# Git Setup Script for public_html
# Run this script to set up and push to git

Write-Host "🚀 Setting up Git for public_html..." -ForegroundColor Green
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
}

# Add all files
Write-Host "Adding files to git..." -ForegroundColor Yellow
git add .

# Check if remote exists
$remote = git remote -v
if ([string]::IsNullOrEmpty($remote)) {
    Write-Host ""
    Write-Host "⚠️  No remote repository configured!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To add a remote repository, run:" -ForegroundColor Cyan
    Write-Host "  git remote add origin <your-repo-url>" -ForegroundColor White
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Cyan
    Write-Host "  git remote add origin https://github.com/yourusername/trinity-oil-mills.git" -ForegroundColor White
    Write-Host ""
    Write-Host "Then commit and push:" -ForegroundColor Cyan
    Write-Host "  git commit -m 'Initial commit - Port 3001'" -ForegroundColor White
    Write-Host "  git branch -M main" -ForegroundColor White
    Write-Host "  git push -u origin main" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "✅ Remote repository found:" -ForegroundColor Green
    Write-Host $remote
    Write-Host ""
    Write-Host "Ready to commit and push!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run these commands:" -ForegroundColor Cyan
    Write-Host "  git commit -m 'Initial commit - Port 3001'" -ForegroundColor White
    Write-Host "  git branch -M main" -ForegroundColor White
    Write-Host "  git push -u origin main" -ForegroundColor White
}

Write-Host ""
Write-Host "📋 Current status:" -ForegroundColor Yellow
git status --short

