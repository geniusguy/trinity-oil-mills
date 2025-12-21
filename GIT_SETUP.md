# Git Setup for public_html

## Initialize Git (if not already done)
```bash
cd public_html
git init
```

## Add Remote Repository
```bash
git remote add origin <your-git-repo-url>
# Example: git remote add origin https://github.com/yourusername/trinity-oil-mills.git
```

## First Commit and Push
```bash
git add .
git commit -m "Initial commit - Port 3001, ready for deployment"
git branch -M main
git push -u origin main
```

## Future Updates
```bash
git add .
git commit -m "Description of changes"
git push origin main
```

