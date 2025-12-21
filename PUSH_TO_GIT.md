# Push public_html to Git - Step by Step

## Step 1: Add Remote Repository

```bash
cd public_html
git remote add origin <your-git-repo-url>
```

**Examples:**
- GitHub: `git remote add origin https://github.com/yourusername/trinity-oil-mills.git`
- GitLab: `git remote add origin https://gitlab.com/yourusername/trinity-oil-mills.git`
- Bitbucket: `git remote add origin https://bitbucket.org/yourusername/trinity-oil-mills.git`

## Step 2: Add All Files

```bash
git add .
```

## Step 3: Commit

```bash
git commit -m "Initial commit - Port 3001, ready for deployment"
```

## Step 4: Set Main Branch

```bash
git branch -M main
```

## Step 5: Push to Git

```bash
git push -u origin main
```

---

## Complete Command Sequence

```bash
cd public_html
git remote add origin <your-repo-url>
git add .
git commit -m "Initial commit - Port 3001, ready for deployment"
git branch -M main
git push -u origin main
```

---

## Future Updates

After making changes:

```bash
cd public_html
git add .
git commit -m "Description of your changes"
git push origin main
```

---

## Verify

Check your remote:
```bash
git remote -v
```

Check status:
```bash
git status
```

