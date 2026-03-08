#!/usr/bin/env node
/**
 * Schedules daily backup at 00:00 and emails to rvkiran@yahoo.com
 * Run: node scripts/backup-scheduler.js (or npm run backup:schedule)
 * Keeps running and runs backup every day at midnight.
 */

const path = require('path');
const { spawn } = require('child_process');
const cron = require('node-cron');

const PROJECT_ROOT = path.join(__dirname, '..');
const BACKUP_SCRIPT = path.join(__dirname, 'backup-and-email.js');

function runBackup() {
  console.log('[scheduler] Running scheduled backup at', new Date().toISOString());
  const child = spawn('node', [BACKUP_SCRIPT], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    env: process.env,
  });
  child.on('close', (code) => {
    if (code !== 0) console.error('[scheduler] Backup exited with code', code);
  });
}

// Every day at 00:00 (midnight)
cron.schedule('0 0 * * *', runBackup, {
  timezone: 'Asia/Kolkata',
});

console.log('[scheduler] Daily backup scheduled at 00:00 (Asia/Kolkata). Next run: midnight.');
console.log('[scheduler] Press Ctrl+C to stop.');
// Optional: run once on start for testing (comment out in production)
// runBackup();
