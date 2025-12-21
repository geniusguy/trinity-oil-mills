# Suppress Dotenv Warnings

## Problem
Build shows warnings:
```
[dotenv@17.2.2] injecting env (0) from .env.local -- tip: ...
```

## Solution

These warnings are **harmless** - they're just informational messages from Next.js's internal dotenv usage. However, we've suppressed them:

### 1. In `next.config.ts`
Added: `process.env.DOTENV_CONFIG_QUIET = 'true';`

### 2. In `package.json` build script
Changed: `"build": "DOTENV_CONFIG_QUIET=true next build"`

## Why These Warnings Appear

- Next.js automatically tries to load `.env.local` during build
- If the file doesn't exist or is empty, dotenv shows these informational messages
- They don't affect functionality - just informational

## Alternative: Create Empty .env.local

If warnings persist, you can create an empty `.env.local` file:
```bash
touch .env.local
```

But this is not necessary - the warnings are harmless.

## Result

After these changes, the build should be cleaner without the dotenv warnings.

