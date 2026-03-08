# Daily backup and email

Automated database backup at **00:00** every day, sent to **rvkiran@yahoo.com**.

## With PM2 (no extra command)

The backup is **built into the main app**. When you start the server with PM2, the daily backup is scheduled automatically:

```bash
pm2 start start-server.js --name trinity-oil
# or: pm2 start npm --name trinity-oil -- start
```

Same process runs the Next.js server and the 00:00 backup job. No separate backup process needed.

## Requirements

- **DATABASE_URL** in `.env.production` (for the DB to dump)
- **SMTP** in `.env.production`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (or `EMAIL_USER` / `EMAIL_PASS`)

## Manual run

One-off backup and email:

```bash
npm run backup:email
```

## What it does

1. At 00:00 (Asia/Kolkata) the app runs `scripts/backup-and-email.js`
2. Script dumps the database to a temporary `.sql` file
3. Sends it as an email attachment to **rvkiran@yahoo.com**
4. Deletes the temporary file

Subject format: `Trinity Oil Mills – Daily DB backup YYYY-MM-DD`.
