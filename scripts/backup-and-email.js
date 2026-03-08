#!/usr/bin/env node
/**
 * Trinity Oil Mills - Daily backup and email
 * Dumps the database and emails the .sql file to rvkiran@yahoo.com
 * Run manually: node scripts/backup-and-email.js
 * Schedule daily at 00:00 via cron or: npm run backup:schedule
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

const BACKUP_EMAIL = 'rvkiran@yahoo.com';
const PROJECT_ROOT = path.join(__dirname, '..');

function loadEnv() {
  const candidates = [
    path.join(PROJECT_ROOT, '.env.production'),
    path.join(PROJECT_ROOT, '.env.local'),
    path.join(PROJECT_ROOT, '.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      console.log('[backup] Loaded env from', path.basename(p));
      return;
    }
  }
  console.warn('[backup] No .env file found, using process.env');
}

function escapeValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Date) return `'${v.toISOString().replace('T', ' ').replace(/\..+/, '')}'`;
  if (Buffer.isBuffer(v)) return `'${v.toString('base64')}'`;
  const s = String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${s}'`;
}

async function createDump(outFile) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not set. Add it to .env.production or .env.local');

  const url = new URL(dbUrl);
  const host = url.hostname || 'localhost';
  const port = url.port ? Number(url.port) : 3306;
  const user = decodeURIComponent(url.username || 'root');
  const password = decodeURIComponent(url.password || '');
  const database = url.pathname.replace(/^\//, '');

  console.log('[backup] Connecting to', `${user}@${host}:${port}/${database}`);
  const connection = await mysql.createConnection({ host, port, user, password, database });

  const writeStream = fs.createWriteStream(outFile, { encoding: 'utf8' });
  const header = [
    '-- Trinity Oil Mills DB backup',
    `-- Database: ${database}`,
    `-- Date: ${new Date().toISOString()}`,
    '',
    'SET FOREIGN_KEY_CHECKS=0;',
    '',
  ].join('\n');
  writeStream.write(header + '\n');

  const [tablesRows] = await connection.query('SHOW TABLES');
  const tableKey = Object.keys(tablesRows[0] || {})[0];
  const tables = tablesRows.map((row) => row[tableKey]);

  for (const table of tables) {
    const [createRows] = await connection.query('SHOW CREATE TABLE ??', [table]);
    const createSql = createRows[0]['Create Table'] || createRows[0]['Create Table'.toLowerCase()];
    writeStream.write(`\n-- Table: ${table}\n`);
    writeStream.write(`DROP TABLE IF EXISTS \`${table}\`;\n`);
    writeStream.write(createSql + ';\n');

    const [rows] = await connection.query('SELECT * FROM ??', [table]);
    if (rows.length > 0) {
      for (const row of rows) {
        const cols = Object.keys(row).map((c) => `\`${c}\``).join(', ');
        const vals = Object.values(row).map((v) => escapeValue(v)).join(', ');
        writeStream.write(`INSERT INTO \`${table}\` (${cols}) VALUES (${vals});\n`);
      }
    }
  }
  writeStream.write('\nSET FOREIGN_KEY_CHECKS=1;\n');
  await new Promise((res) => writeStream.end(res));
  await connection.end();

  return { database, size: fs.statSync(outFile).size };
}

async function sendBackupEmail(filePath, database) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('SMTP_USER and SMTP_PASSWORD (or EMAIL_USER/EMAIL_PASS) must be set to send backup email');
  }

  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  const filename = path.basename(filePath);
  const date = new Date().toISOString().slice(0, 10);

  await transporter.sendMail({
    from: process.env.SMTP_EMAIL_FROM || user,
    to: BACKUP_EMAIL,
    subject: `Trinity Oil Mills – Daily DB backup ${date}`,
    text: `Daily database backup for Trinity Oil Mills (${database}) – ${date}. See attached .sql file.`,
    html: `<p>Daily database backup for <b>Trinity Oil Mills</b> (database: ${database}) – ${date}.</p><p>Attachment: ${filename}</p>`,
    attachments: [{ filename, content: fs.createReadStream(filePath) }],
  });
  console.log('[backup] Email sent to', BACKUP_EMAIL);
}

async function main() {
  loadEnv();
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const outFile = path.join(PROJECT_ROOT, `db-backup-email_${timestamp}.sql`);

  try {
    const { database, size } = await createDump(outFile);
    console.log('[backup] Dump created:', outFile, `(${(size / 1024).toFixed(1)} KB)`);
    await sendBackupEmail(outFile, database);
  } finally {
    if (fs.existsSync(outFile)) {
      fs.unlinkSync(outFile);
      console.log('[backup] Temp file removed');
    }
  }
  console.log('[backup] Done');
}

main().catch((err) => {
  console.error('[backup] Error:', err.message);
  process.exit(1);
});
