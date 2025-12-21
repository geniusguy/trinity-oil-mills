# Git Authentication Setup Script
# This will help you login and push to git

Write-Host "🔐 Git Authentication Setup" -ForegroundColor Green
Write-Host ""

# Check current git config
Write-Host "Current Git Configuration:" -ForegroundColor Yellow
git config --global user.name
git config --global user.email
Write-Host ""

# Check if remote is set
$remote = git remote -v
if ([string]::IsNullOrEmpty($remote)) {
    Write-Host "⚠️  No remote repository configured!" -ForegroundColor Red
    Write-Host ""
    $repoUrl = Read-Host "Enter your Git repository URL (e.g., https://github.com/username/repo.git)"
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "✅ Remote added: $repoUrl" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Remote repository configured:" -ForegroundColor Green
    Write-Host $remote
    Write-Host ""
}

# Set up credential helper for Windows
Write-Host "Setting up Windows credential manager..." -ForegroundColor Yellow
git config --global credential.helper wincred
Write-Host "✅ Credential helper configured" -ForegroundColor Green
Write-Host ""

# Check if user name/email are set
$userName = git config --global user.name
$userEmail = git config --global user.email

if ([string]::IsNullOrEmpty($userName)) {
    $name = Read-Host "Enter your Git username"
    if ($name) {
        git config --global user.name $name
        Write-Host "✅ Username set" -ForegroundColor Green
    }
}

if ([string]::IsNullOrEmpty($userEmail)) {
    $email = Read-Host "Enter your Git email"
    if ($email) {
        git config --global user.email $email
        Write-Host "✅ Email set" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📋 Ready to push! Run these commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  git add ." -ForegroundColor White
Write-Host "  git commit -m 'Initial commit - Port 3001'" -ForegroundColor White
Write-Host "  git branch -M main" -ForegroundColor White
Write-Host "  git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "💡 When you push, Git will prompt for your credentials." -ForegroundColor Yellow
Write-Host "   Windows will save them for future use." -ForegroundColor Yellow

