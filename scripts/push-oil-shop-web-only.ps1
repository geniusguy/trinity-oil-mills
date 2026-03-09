# Run from: D:\React\TrintyOilMills\oil-shop-web\scripts (or from oil-shop-web)
# This script: creates repo-oil-only, clones trinity-oil-mills, replaces contents with oil-shop-web, force-pushes.
# Result: GitHub repo root = oil-shop-web contents only (package.json, src/, etc. at root).

$ErrorActionPreference = "Stop"
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path (Get-Location) -Parent }
$OilShopPath = (Resolve-Path (Join-Path $ScriptDir "..")).Path
if (-not (Test-Path (Join-Path $OilShopPath "package.json"))) {
    Write-Host "Error: package.json not found in $OilShopPath. Run from oil-shop-web\scripts."
    exit 1
}

$RepoParent = Split-Path $OilShopPath -Parent
$RepoDir = Join-Path $RepoParent "repo-oil-only"
if (Test-Path $RepoDir) {
    Write-Host "Removing existing repo-oil-only..."
    Remove-Item $RepoDir -Recurse -Force
}

Write-Host "Cloning geniusguy/trinity-oil-mills into repo-oil-only..."
Set-Location $RepoParent
git clone https://github.com/geniusguy/trinity-oil-mills.git repo-oil-only
Set-Location $RepoDir

Write-Host "Removing all files except .git..."
Get-ChildItem -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force

Write-Host "Copying oil-shop-web contents to repo root..."
Copy-Item -Path (Join-Path $OilShopPath "*") -Destination "." -Recurse -Force
if (Test-Path (Join-Path $OilShopPath ".gitignore")) { Copy-Item (Join-Path $OilShopPath ".gitignore") "." -Force }
if (Test-Path (Join-Path $OilShopPath ".env.example")) { Copy-Item (Join-Path $OilShopPath ".env.example") "." -Force }

if (Test-Path "oil-shop-web") {
    Write-Host "Removing nested oil-shop-web folder..."
    Remove-Item "oil-shop-web" -Recurse -Force
}

Write-Host "Staging and committing..."
git add -A
git status
git commit -m "Repo root = oil-shop-web only (single project)"

Write-Host "Force pushing to origin main..."
git push origin main --force

Write-Host "Done. GitHub repo now has only oil-shop-web at root."
Write-Host "On server run: cd /var/www/trinityoil-api && git fetch origin main && git reset --hard origin/main && npm install && npm run build && pm2 restart trinity-oil"
