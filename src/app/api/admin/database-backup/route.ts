import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fsPromises from 'fs/promises';
import { createReadStream } from 'fs';
import os from 'os';
import path from 'path';
import mysql from 'mysql2/promise';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getDatabaseConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL is not configured');
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL is invalid');
  }

  const protocol = parsed.protocol.replace(':', '');
  if (!['mysql', 'mariadb'].includes(protocol)) {
    throw new Error('DATABASE_URL must use mysql/mariadb protocol');
  }

  const username = decodeURIComponent(parsed.username || '');
  const password = decodeURIComponent(parsed.password || '');
  const host = parsed.hostname || 'localhost';
  const port = parsed.port || '3306';
  const dbName = parsed.pathname.replace(/^\//, '').trim();

  if (!username || !dbName) {
    throw new Error('DATABASE_URL is missing username or database name');
  }

  return { username, password, host, port, dbName };
}

async function fileExists(filePath: string) {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(command: string) {
  return new Promise<boolean>((resolve) => {
    const child = spawn(command, ['--version'], { windowsHide: true });
    child.on('error', () => resolve(false));
    child.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

function appendExeIfNeeded(cmd: string) {
  if (process.platform === 'win32' && !cmd.toLowerCase().endsWith('.exe')) {
    return `${cmd}.exe`;
  }
  return cmd;
}

/** Windows: resolve first PATH hit via `where.exe`. */
async function whereOnPath(command: string): Promise<string | null> {
  if (process.platform !== 'win32') return null;
  return new Promise((resolve) => {
    const child = spawn('where.exe', [command], { windowsHide: true });
    const out: string[] = [];
    child.stdout.on('data', (chunk) => out.push(chunk.toString('utf8')));
    child.on('error', () => resolve(null));
    child.on('close', (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      const first = out
        .join('')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .find(Boolean);
      resolve(first || null);
    });
  });
}

/** Collect `...\bin` folders under a parent (Laragon/WAMP style versioned installs). */
async function discoverVersionedBinDirs(parentDir: string): Promise<string[]> {
  const bins: string[] = [];
  try {
    const entries = await fsPromises.readdir(parentDir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const binDir = path.join(parentDir, ent.name, 'bin');
      if (await fileExists(binDir)) bins.push(binDir);
    }
  } catch {
    // parent missing — skip
  }
  return bins;
}

async function windowsBinSearchDirs(): Promise<string[]> {
  const dirs = new Set<string>();
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  for (const d of await discoverVersionedBinDirs(path.join(programFiles, 'MySQL'))) {
    dirs.add(d);
  }
  for (const d of await discoverVersionedBinDirs(path.join(programFilesX86, 'MySQL'))) {
    dirs.add(d);
  }

  const staticVendors = [
    path.join(programFiles, 'MySQL', 'MySQL Server 9.5', 'bin'),
    path.join(programFiles, 'MySQL', 'MySQL Server 8.4', 'bin'),
    path.join(programFiles, 'MySQL', 'MySQL Server 8.0', 'bin'),
    path.join(programFiles, 'MySQL', 'MySQL Server 5.7', 'bin'),
    path.join(programFilesX86, 'MySQL', 'MySQL Server 9.5', 'bin'),
    path.join(programFilesX86, 'MySQL', 'MySQL Server 8.4', 'bin'),
    path.join(programFilesX86, 'MySQL', 'MySQL Server 8.0', 'bin'),
    path.join(programFilesX86, 'MySQL', 'MySQL Server 5.7', 'bin'),
    'C:\\xampp\\mysql\\bin',
    'C:\\Program Files\\MariaDB 11.4\\bin',
    'C:\\Program Files\\MariaDB 11.3\\bin',
    'C:\\Program Files\\MariaDB 11.2\\bin',
    'C:\\Program Files\\MariaDB 11.1\\bin',
    'C:\\Program Files\\MariaDB 11.0\\bin',
    'C:\\Program Files\\MariaDB 10.11\\bin',
    'C:\\Program Files\\MariaDB 10.6\\bin',
  ];

  for (const d of staticVendors) dirs.add(d);

  const laragonRoot = process.env.LARAGON_ROOT || 'C:\\laragon';
  for (const d of await discoverVersionedBinDirs(path.join(laragonRoot, 'bin', 'mysql'))) {
    dirs.add(d);
  }
  for (const d of await discoverVersionedBinDirs('C:\\wamp64\\bin\\mysql')) {
    dirs.add(d);
  }
  for (const d of await discoverVersionedBinDirs('C:\\wamp\\bin\\mysql')) {
    dirs.add(d);
  }

  return Array.from(dirs);
}

/** Returns CLI path or null (never throws — callers use SQL driver fallback). */
async function resolveDbBinary(kind: 'dump' | 'client'): Promise<string | null> {
  const envOverride =
    kind === 'dump'
      ? process.env.MYSQLDUMP_PATH || process.env.MYSQLDUMP_BIN
      : process.env.MYSQL_PATH || process.env.MYSQL_BIN;

  const names = kind === 'dump' ? ['mysqldump', 'mariadb-dump'] : ['mysql', 'mariadb'];
  const candidates: string[] = [];

  if (envOverride) candidates.push(envOverride);

  if (process.platform === 'win32') {
    for (const name of names) {
      const fromPath = await whereOnPath(name);
      if (fromPath) candidates.push(fromPath);
      const fromPathExe = await whereOnPath(appendExeIfNeeded(name));
      if (fromPathExe) candidates.push(fromPathExe);
    }
    for (const binDir of await windowsBinSearchDirs()) {
      for (const name of names) {
        candidates.push(path.join(binDir, appendExeIfNeeded(name)));
      }
    }
  }

  for (const name of names) {
    candidates.push(name);
    candidates.push(appendExeIfNeeded(name));
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const isBareCommand = !candidate.includes('\\') && !candidate.includes('/');
    if (isBareCommand) {
      if (await commandExists(candidate)) return candidate;
      continue;
    }
    if (await fileExists(candidate)) return candidate;
  }

  return null;
}

function sanitizeSqlDump(input: string) {
  // Improves cross-restore between MySQL Workbench and MariaDB by removing definer ownership.
  return input
    .replace(/DEFINER=`[^`]+`@`[^`]+`/gi, '')
    .replace(/\/\*!\d+\s+DEFINER=`[^`]+`@`[^`]+`\s*\*\//gi, '');
}

function escapeSqlValue(value: unknown) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  if (Buffer.isBuffer(value)) {
    return `0x${value.toString('hex')}`;
  }
  const s = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\u0000/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u001a/g, '\\Z');
  return `'${s}'`;
}

async function generateDumpWithoutBinary(cfg: ReturnType<typeof getDatabaseConfig>) {
  const connection = await mysql.createConnection({
    host: cfg.host,
    port: Number(cfg.port),
    user: cfg.username,
    password: cfg.password,
    database: cfg.dbName,
    timezone: 'Z',
  });

  try {
    const chunks: string[] = [];
    chunks.push('-- Backup generated without mysqldump/mariadb-dump');
    chunks.push(`-- Database: ${cfg.dbName}`);
    chunks.push(`-- Generated at: ${new Date().toISOString()}`);
    chunks.push('SET FOREIGN_KEY_CHECKS=0;');
    chunks.push('');

    const [tablesRows] = await connection.query('SHOW TABLES');
    const tableKey = Object.keys((tablesRows as any[])[0] || {})[0];
    const tables = (tablesRows as any[]).map((r) => String(r[tableKey]));

    for (const table of tables) {
      const [createRows] = await connection.query('SHOW CREATE TABLE ??', [table]);
      const createSql =
        (createRows as any[])[0]?.['Create Table'] ??
        (createRows as any[])[0]?.['Create View'] ??
        null;
      if (!createSql) continue;

      chunks.push(`-- Table: \`${table}\``);
      chunks.push(`DROP TABLE IF EXISTS \`${table}\`;`);
      chunks.push(`${createSql};`);

      const [rows] = await connection.query('SELECT * FROM ??', [table]);
      const rowList = rows as Record<string, unknown>[];
      if (rowList.length > 0) {
        for (const row of rowList) {
          const cols = Object.keys(row).map((c) => `\`${c}\``).join(', ');
          const vals = Object.values(row).map(escapeSqlValue).join(', ');
          chunks.push(`INSERT INTO \`${table}\` (${cols}) VALUES (${vals});`);
        }
      }
      chunks.push('');
    }

    chunks.push('SET FOREIGN_KEY_CHECKS=1;');
    return Buffer.from(chunks.join('\n'), 'utf8');
  } finally {
    await connection.end();
  }
}

/** Split mysqldump SQL into executable statements (handles quoted semicolons). */
function splitSqlStatements(input: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escape) {
      current += ch;
      escape = false;
      continue;
    }
    if (ch === '\\' && (inSingle || inDouble)) {
      current += ch;
      escape = true;
      continue;
    }
    if (ch === "'" && !inDouble && !inBacktick) {
      inSingle = !inSingle;
      current += ch;
      continue;
    }
    if (ch === '"' && !inSingle && !inBacktick) {
      inDouble = !inDouble;
      current += ch;
      continue;
    }
    if (ch === '`' && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      current += ch;
      continue;
    }
    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith('--')) statements.push(stmt);
      current = '';
      continue;
    }
    current += ch;
  }

  const tail = current.trim();
  if (tail && !tail.startsWith('--')) statements.push(tail);
  return statements;
}

async function restoreWithoutBinary(
  cfg: ReturnType<typeof getDatabaseConfig>,
  sanitizedSql: string,
  dropExisting: boolean
) {
  const connection = await mysql.createConnection({
    host: cfg.host,
    port: Number(cfg.port),
    user: cfg.username,
    password: cfg.password,
    database: cfg.dbName,
    timezone: 'Z',
    multipleStatements: true,
  });

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    if (dropExisting) {
      const [tablesRows] = await connection.query('SHOW TABLES');
      const tableKey = Object.keys((tablesRows as any[])[0] || {})[0];
      const tables = (tablesRows as any[]).map((r) => String(r[tableKey])).filter(Boolean);
      if (tables.length > 0) {
        await connection.query(`DROP TABLE IF EXISTS ${tables.map((t) => `\`${t}\``).join(', ')}`);
      }
    }

    const statements = splitSqlStatements(sanitizedSql);
    for (const stmt of statements) {
      const upper = stmt.trimStart().toUpperCase();
      if (
        upper.startsWith('/*!') ||
        upper.startsWith('USE ') ||
        upper === 'SET FOREIGN_KEY_CHECKS=0' ||
        upper === 'SET FOREIGN_KEY_CHECKS=1'
      ) {
        continue;
      }
      await connection.query(stmt);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS=1');
  } finally {
    await connection.end();
  }
}

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let cfg: ReturnType<typeof getDatabaseConfig>;
  try {
    cfg = getDatabaseConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid database configuration';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const args = [
    '--single-transaction',
    '--quick',
    '--routines',
    '--triggers',
    '--skip-lock-tables',
    '-h',
    cfg.host,
    '-P',
    cfg.port,
    '-u',
    cfg.username,
    cfg.dbName,
  ];

  const dumpCmd = await resolveDbBinary('dump');
  if (!dumpCmd) {
    console.info('[database-backup] mysqldump not found — using in-app SQL backup (set MYSQLDUMP_PATH to use CLI).');
  }

  let dump: { sql: Buffer; stderr: string };
  if (dumpCmd) {
    const extraCompatArgs = dumpCmd.toLowerCase().includes('mysqldump')
      ? ['--column-statistics=0', '--set-gtid-purged=OFF']
      : [];

    dump = await new Promise<{ sql: Buffer; stderr: string }>((resolve, reject) => {
      const child = spawn(dumpCmd as string, [...extraCompatArgs, ...args], {
        env: {
          ...process.env,
          MYSQL_PWD: cfg.password,
        },
        windowsHide: true,
      });

      const out: Buffer[] = [];
      const err: Buffer[] = [];

      child.stdout.on('data', (chunk: Buffer) => out.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => err.push(chunk));
      child.on('error', (e) => reject(e));
      child.on('close', (code) => {
        const stderr = Buffer.concat(err).toString('utf8').trim();
        if (code === 0) {
          resolve({ sql: Buffer.concat(out), stderr });
        } else {
          reject(new Error(stderr || `db dump failed with exit code ${code}`));
        }
      });
    }).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      // Retry once without MySQL-specific compatibility flags (helps older/newer mixed environments).
      if (message.toLowerCase().includes('unknown option') || message.toLowerCase().includes('unrecognized option')) {
        return new Promise<{ sql: Buffer; stderr: string }>((resolve, reject) => {
          const child = spawn(dumpCmd as string, args, {
            env: {
              ...process.env,
              MYSQL_PWD: cfg.password,
            },
            windowsHide: true,
          });
          const out: Buffer[] = [];
          const err: Buffer[] = [];
          child.stdout.on('data', (chunk: Buffer) => out.push(chunk));
          child.stderr.on('data', (chunk: Buffer) => err.push(chunk));
          child.on('error', (e) => reject(e));
          child.on('close', (code) => {
            const stderr = Buffer.concat(err).toString('utf8').trim();
            if (code === 0) resolve({ sql: Buffer.concat(out), stderr });
            else reject(new Error(stderr || `db dump failed with exit code ${code}`));
          });
        });
      }
      console.warn('[database-backup] binary dump failed, using SQL fallback:', message);
      const fallbackSql = await generateDumpWithoutBinary(cfg);
      return { sql: fallbackSql, stderr: 'fallback: generated without external dump binary' };
    });
  } else {
    const fallbackSql = await generateDumpWithoutBinary(cfg);
    dump = { sql: fallbackSql, stderr: 'fallback: generated without external dump binary' };
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${cfg.dbName}-backup-${stamp}.sql`;

  return new NextResponse(dump.sql, {
    status: 200,
    headers: {
      'Content-Type': 'application/sql; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Backup-Note': dump.stderr ? 'database dump completed with warnings' : 'ok',
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let cfg: ReturnType<typeof getDatabaseConfig>;
  try {
    cfg = getDatabaseConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid database configuration';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const dropExistingRaw = formData.get('dropExisting');
  const dropExisting = String(dropExistingRaw ?? 'true').toLowerCase() !== 'false';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No .sql file uploaded' }, { status: 400 });
  }

  const fileName = String(file.name || '').toLowerCase();
  if (!fileName.endsWith('.sql')) {
    return NextResponse.json({ error: 'Only .sql files are allowed' }, { status: 400 });
  }

  // Limit to 200MB to avoid memory/CPU spikes.
  const maxBytes = 200 * 1024 * 1024;
  if (typeof file.size === 'number' && file.size > maxBytes) {
    return NextResponse.json({ error: 'SQL file too large (max 200MB)' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const rawText = Buffer.from(bytes).toString('utf8');
  const sanitizedText = sanitizeSqlDump(rawText);
  const buffer = Buffer.from(sanitizedText, 'utf8');

  const tmpDir = path.join(os.tmpdir(), 'tom-db-restore');
  await fsPromises.mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `restore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sql`);
  await fsPromises.writeFile(tmpPath, buffer);

  const mysqlEnv = {
    ...process.env,
    MYSQL_PWD: cfg.password,
  };

  const mysqlCmd = await resolveDbBinary('client');
  if (!mysqlCmd) {
    console.info('[database-backup] mysql client not found — using in-app SQL restore (set MYSQL_PATH to use CLI).');
  }

  const normalizeClientError = (errorMessage: string) => {
    if (errorMessage.includes('ENOENT')) {
      return 'Database client tool not found. Set MYSQL_PATH to full path of mysql.exe or mariadb.exe.';
    }
    return errorMessage;
  };

  const runMysql = (sqlText: string) =>
    new Promise<void>((resolve, reject) => {
      if (!mysqlCmd) {
        reject(new Error('mysql client not available'));
        return;
      }
      const args = ['-h', cfg.host, '-P', cfg.port, '-u', cfg.username, cfg.dbName, '--batch', '--skip-column-names', '-e', sqlText];
      const child = spawn(mysqlCmd, args, { env: mysqlEnv, windowsHide: true });
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8');
      });
      child.on('error', (e) => reject(e));
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(normalizeClientError(stderr.trim() || `mysql exited with code ${code}`)));
      });
    });

  const runMysqlCapture = (sqlText: string) =>
    new Promise<string>((resolve, reject) => {
      if (!mysqlCmd) {
        reject(new Error('mysql client not available'));
        return;
      }
      const args = ['-h', cfg.host, '-P', cfg.port, '-u', cfg.username, cfg.dbName, '--batch', '--skip-column-names', '-e', sqlText];
      const child = spawn(mysqlCmd, args, { env: mysqlEnv, windowsHide: true });
      const out: Buffer[] = [];
      const err: Buffer[] = [];
      child.stdout.on('data', (chunk) => out.push(chunk));
      child.stderr.on('data', (chunk) => err.push(chunk));
      child.on('error', (e) => reject(e));
      child.on('close', (code) => {
        const stderr = Buffer.concat(err).toString('utf8').trim();
        if (code === 0) resolve(Buffer.concat(out).toString('utf8'));
        else reject(new Error(normalizeClientError(stderr || `mysql exited with code ${code}`)));
      });
    });

  try {
    if (!mysqlCmd) {
      await restoreWithoutBinary(cfg, sanitizedText, dropExisting);
      return NextResponse.json({
        success: true,
        message: 'Database restored successfully (fallback: restored without external client binary)',
      });
    }

    if (dropExisting) {
      // Get current tables and drop them.
      const tablesRaw = await runMysqlCapture('SHOW TABLES;');
      const tables = tablesRaw.split('\n').map((s) => s.trim()).filter(Boolean);
      if (tables.length > 0) {
        const dropSql = `SET FOREIGN_KEY_CHECKS=0; DROP TABLE IF EXISTS ${tables.map((t) => `\`${t}\``).join(',')}; SET FOREIGN_KEY_CHECKS=1;`;
        await runMysql(dropSql);
      }
    }

    // Import uploaded SQL
    await new Promise<void>((resolve, reject) => {
      const args = ['-h', cfg.host, '-P', cfg.port, '-u', cfg.username, cfg.dbName];
      const child = spawn(mysqlCmd, args, { env: mysqlEnv, windowsHide: true });
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8');
      });

      const readStream = createReadStream(tmpPath);
      readStream.on('error', reject);
      readStream.pipe(child.stdin);

      child.on('error', (e) => reject(e));
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(normalizeClientError(stderr.trim() || `mysql import exited with code ${code}`)));
      });
    });

    return NextResponse.json({ success: true, message: 'Database restored successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Restore failed';
    // If CLI import failed, retry with driver-based restore.
    if (mysqlCmd) {
      try {
        console.warn('[database-backup] CLI restore failed, retrying via driver:', message);
        await restoreWithoutBinary(cfg, sanitizedText, dropExisting);
        return NextResponse.json({
          success: true,
          message: 'Database restored successfully (fallback: restored without external client binary)',
        });
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Restore failed';
        return NextResponse.json({ success: false, error: fallbackMessage }, { status: 500 });
      }
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  } finally {
    try {
      await fsPromises.unlink(tmpPath);
    } catch {
      // ignore
    }
  }
}

