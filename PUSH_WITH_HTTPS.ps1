# Push Using HTTPS (No SSH Key Needed)

Write-Host "🔧 Switching to HTTPS and Pushing..." -ForegroundColor Green
Write-Host ""

# Add Git to PATH
$gitDir = "C:\Users\wemar\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd"
$env:Path = "$gitDir;$env:Path"

# Navigate to public_html
Set-Location D:\React\TrintyOilMills\public_html

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Change remote to HTTPS (no SSH key needed)
Write-Host "🔗 Switching remote to HTTPS..." -ForegroundColor Yellow
git remote set-url origin https://github.com/geniusguy/trinity-oil-mills.git
Write-Host "✅ Remote changed to HTTPS" -ForegroundColor Green
Write-Host ""

# Verify remote
Write-Host "📋 Remote URL:" -ForegroundColor Yellow
git remote -v
Write-Host ""

# Push
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "💡 You'll be prompted for GitHub username and password/token" -ForegroundColor Cyan
Write-Host ""

git push -u origin main

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS! Code pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "❌ Error occurred." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 If password doesn't work, use a Personal Access Token:" -ForegroundColor Yellow
    Write-Host "   1. Go to GitHub.com → Settings → Developer settings → Personal access tokens" -ForegroundColor Cyan
    Write-Host "   2. Generate new token (classic)" -ForegroundColor Cyan
    Write-Host "   3. Use token as password when prompted" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   OR use GitHub Desktop instead (easiest)!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

