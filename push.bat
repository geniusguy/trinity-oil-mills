@echo off
echo ========================================
echo Git Push Script for public_html
echo ========================================
echo.

cd /d D:\React\TrintyOilMills\public_html

echo Current directory: %CD%
echo.

echo Step 1: Checking git status...
git status
echo.

echo Step 2: Adding all files...
git add .
echo.

echo Step 3: Committing changes...
git commit -m "Initial commit - Port 3001, ready for deployment"
echo.

echo Step 4: Setting main branch...
git branch -M main
echo.

echo Step 5: Pushing to GitHub...
echo NOTE: Make sure you've added your remote repository first!
echo Run: git remote add origin https://github.com/yourusername/repo.git
echo.
git push -u origin main

echo.
echo ========================================
echo Done!
echo ========================================
pause

