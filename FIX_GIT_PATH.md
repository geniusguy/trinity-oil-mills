# Fix Git Not Recognized Error

## Problem
Git command is not recognized in PowerShell/Command Prompt.

## Solution Options

### Option 1: Add Git to PATH (Recommended)

1. **Find Git installation:**
   - Usually at: `C:\Program Files\Git\cmd\`
   - Or: `C:\Program Files (x86)\Git\cmd\`
   - Or with GitHub Desktop: `%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd\`

2. **Add to PATH:**
   - Open System Properties → Environment Variables
   - Edit "Path" variable
   - Add: `C:\Program Files\Git\cmd`
   - Click OK and restart terminal

### Option 2: Use GitHub Desktop (Easier)

Since you have GitHub Desktop installed, use it instead:

1. Open GitHub Desktop
2. It should show your `public_html` repository
3. Make changes, commit, and push through the GUI

### Option 3: Use Full Path to Git

Instead of `git`, use full path:
```powershell
& "C:\Program Files\Git\cmd\git.exe" remote add origin git@github.com:geniusguy/trinity-oil-mills.git
```

### Option 4: Restart Terminal After Installing Git

If you just installed Git:
1. Close all terminal windows
2. Open a new terminal
3. Try `git --version` to verify

## Quick Fix Script

Run this in PowerShell (as Administrator):

```powershell
# Add Git to PATH for current session
$env:Path += ";C:\Program Files\Git\cmd"

# Verify
git --version
```

## Recommended: Use GitHub Desktop

Since you already have GitHub Desktop:
1. Open GitHub Desktop
2. It handles Git commands automatically
3. Just commit and push through the interface

