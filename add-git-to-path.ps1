# Add Git to PATH - Run as Administrator

Write-Host "🔍 Looking for Git installation..." -ForegroundColor Yellow

# Common Git installation paths
$gitPaths = @(
    "C:\Program Files\Git\cmd",
    "C:\Program Files (x86)\Git\cmd",
    "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd"
)

$foundGit = $false

foreach ($path in $gitPaths) {
    $resolvedPath = Resolve-Path $path -ErrorAction SilentlyContinue
    if ($resolvedPath) {
        $gitExe = Join-Path $resolvedPath "git.exe"
        if (Test-Path $gitExe) {
            Write-Host "✅ Found Git at: $resolvedPath" -ForegroundColor Green
            $foundGit = $true
            
            # Add to PATH for current session
            $env:Path += ";$resolvedPath"
            Write-Host "✅ Added to PATH for this session" -ForegroundColor Green
            
            # Test
            Write-Host "`nTesting Git:" -ForegroundColor Yellow
            & $gitExe --version
            
            Write-Host "`n💡 To make permanent, add this to System PATH:" -ForegroundColor Cyan
            Write-Host "   $resolvedPath" -ForegroundColor White
            break
        }
    }
}

if (-not $foundGit) {
    Write-Host "❌ Git not found in common locations" -ForegroundColor Red
    Write-Host "`nPlease install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Or use GitHub Desktop (which includes Git)" -ForegroundColor Yellow
}

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

