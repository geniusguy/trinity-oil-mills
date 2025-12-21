@echo off
echo ========================================
echo Git Push Script - SSH
echo Repository: git@github.com:geniusguy/trinity-oil-mills.git
echo ========================================
echo.

cd /d D:\React\TrintyOilMills\public_html

echo Current directory: %CD%
echo.

echo Step 1: Checking git status...
git status
echo.

echo Step 2: Adding remote (if not already added)...
git remote remove origin 2>nul
git remote add origin git@github.com:geniusguy/trinity-oil-mills.git
echo Remote added: git@github.com:geniusguy/trinity-oil-mills.git
echo.

echo Step 3: Adding all files...
git add .
echo.

echo Step 4: Committing changes...
git commit -m "Initial commit - Port 3001, ready for deployment"
echo.

echo Step 5: Setting main branch...
git branch -M main
echo.

echo Step 6: Pushing to GitHub...
git push -u origin main

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo Success! Code pushed to GitHub.
) else (
    echo Error occurred. Check SSH key setup.
    echo Make sure your SSH key is added to GitHub.
)
echo ========================================
pause

