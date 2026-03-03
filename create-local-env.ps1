# PowerShell script to create .env file for local development

Write-Host "🔧 Creating .env file for local development..." -ForegroundColor Cyan
Write-Host ""

$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Cancelled." -ForegroundColor Red
        exit 0
    }
    $backupPath = "$envPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $envPath $backupPath
    Write-Host "✅ Backed up existing .env to $backupPath" -ForegroundColor Green
}

Write-Host "Please provide your local database credentials:" -ForegroundColor Cyan
Write-Host ""

$DB_HOST = Read-Host "Database Host [localhost]"
if ([string]::IsNullOrWhiteSpace($DB_HOST)) { $DB_HOST = "localhost" }

$DB_PORT = Read-Host "Database Port [3306]"
if ([string]::IsNullOrWhiteSpace($DB_PORT)) { $DB_PORT = "3306" }

$DB_USER = Read-Host "Database Username [root]"
if ([string]::IsNullOrWhiteSpace($DB_USER)) { $DB_USER = "root" }

$DB_PASS = Read-Host "Database Password" -AsSecureString
$DB_PASS_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASS)
)

$DB_NAME = Read-Host "Database Name [trinityoil_oil_shop_db_new]"
if ([string]::IsNullOrWhiteSpace($DB_NAME)) { $DB_NAME = "trinityoil_oil_shop_db_new" }

# Create .env file
$envContent = @"
# Local Development Environment Variables
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=trinity-oil-mills-super-secret-key-2024-development
PORT=3001

# Database Configuration
DATABASE_URL=mysql://${DB_USER}:${DB_PASS_PLAIN}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Email Configuration (optional for local)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=wemarketgaruda@gmail.com
SMTP_PASSWORD=whmg apbm nzhx rlxx
SMTP_EMAIL_FROM=noreply@trinityoil.in

# Security
JWT_SECRET=trinity-oil-jwt-secret-2024-development
ENCRYPTION_KEY=trinity-oil-encryption-key-2024-development
"@

Set-Content -Path $envPath -Value $envContent -Encoding UTF8

Write-Host ""
Write-Host "✅ .env file created!" -ForegroundColor Green
Write-Host ""
Write-Host "DATABASE_URL (masked): mysql://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test database connection: node test-db-connection-simple.js" -ForegroundColor White
Write-Host "2. Start dev server: npm run dev" -ForegroundColor White
Write-Host "3. Test endpoint: http://localhost:3001/api/test-env" -ForegroundColor White

