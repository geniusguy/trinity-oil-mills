# Fix SSH Permission Denied Error

## Problem
`Permission denied (publickey)` - SSH key not set up with GitHub

## Solution Options

### Option 1: Use HTTPS Instead (EASIEST - Recommended)

Switch from SSH to HTTPS URL:

```powershell
cd D:\React\TrintyOilMills\public_html
$gitDir = "C:\Users\wemar\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd"
$env:Path = "$gitDir;$env:Path"

# Change remote to HTTPS
git remote set-url origin https://github.com/geniusguy/trinity-oil-mills.git

# Push (will prompt for username/password or token)
git push -u origin main
```

### Option 2: Use GitHub Desktop (NO COMMANDS NEEDED)

1. Open GitHub Desktop
2. It should show your repository
3. Click "Commit to main" (if not already committed)
4. Click "Push origin"
5. Done! GitHub Desktop handles authentication automatically

### Option 3: Set Up SSH Key (If you prefer SSH)

1. Generate SSH key:
```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. Start ssh-agent:
```powershell
Start-Service ssh-agent
ssh-add ~/.ssh/id_ed25519
```

3. Copy public key:
```powershell
cat ~/.ssh/id_ed25519.pub
```

4. Add to GitHub:
   - Go to GitHub.com → Settings → SSH and GPG keys
   - Click "New SSH key"
   - Paste your public key
   - Save

5. Test:
```powershell
ssh -T git@github.com
```

## Recommended: Use HTTPS or GitHub Desktop

Both are easier than setting up SSH keys!

