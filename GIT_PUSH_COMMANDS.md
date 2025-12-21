# Git Push Commands - Terminal Ready

## Step 1: Configure Git Credentials (One-time setup)

```bash
# Set your Git username and email (if not already set)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Enable Windows credential manager (saves your password)
git config --global credential.helper wincred
```

## Step 2: Add Remote Repository

```bash
cd D:\React\TrintyOilMills\public_html

# Add your Git repository URL
git remote add origin https://github.com/yourusername/trinity-oil-mills.git
# OR if you already have a remote:
git remote set-url origin https://github.com/yourusername/trinity-oil-mills.git
```

## Step 3: Add, Commit, and Push

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit - Port 3001, ready for deployment"

# Set main branch
git branch -M main

# Push (will prompt for username/password first time)
git push -u origin main
```

## Step 4: Future Pushes

After the first push, you can simply:

```bash
cd D:\React\TrintyOilMills\public_html
git add .
git commit -m "Your commit message"
git push origin main
```

Windows will remember your credentials after the first login.

---

## Quick One-Liner Setup

If you want to do it all at once:

```bash
cd D:\React\TrintyOilMills\public_html
git config --global credential.helper wincred
git remote add origin https://github.com/yourusername/trinity-oil-mills.git
git add .
git commit -m "Initial commit - Port 3001"
git branch -M main
git push -u origin main
```

(Replace the GitHub URL with your actual repository URL)

---

## Troubleshooting

### If push asks for credentials every time:
```bash
git config --global credential.helper wincred
```

### To check your remote:
```bash
git remote -v
```

### To update remote URL:
```bash
git remote set-url origin https://github.com/yourusername/trinity-oil-mills.git
```

### To check git config:
```bash
git config --global --list
```

