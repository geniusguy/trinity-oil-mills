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
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error?.code === 'ENOENT') resolve(false);
      else resolve(false);
    });
    child.on('close', (code) => {
      // Most db CLI tools return 0 for --version
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

async function resolveDbBinary(kind: 'dump' | 'client') {
  const envOverride =
    kind === 'dump'
      ? process.env.MYSQLDUMP_PATH || process.env.MYSQLDUMP_BIN
      : process.env.MYSQL_PATH || process.env.MYSQL_BIN;

  const names = kind === 'dump' ? ['mysqldump', 'mariadb-dump'] : ['mysql', 'mariadb'];
  const candidates: string[] = [];

  if (envOverride) candidates.push(envOverride);

  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const windowsRoots = [programFiles, programFilesX86];
    const vendors = [
      'MySQL\\MySQL Server 8.4\\bin',
      'MySQL\\MySQL Server 8.0\\bin',
      'MySQL\\MySQL Server 5.7\\bin',
      'MariaDB 11.4\\bin',
      'MariaDB 11.3\\bin',
      'MariaDB 11.2\\bin',
      'MariaDB 11.1\\bin',
      'MariaDB 11.0\\bin',
      'MariaDB 10.11\\bin',
      'MariaDB 10.6\\bin',
    ];
    for (const root of windowsRoots) {
      for (const vendor of vendors) {
        for (const name of names) {
          candidates.push(path.join(root, vendor, appendExeIfNeeded(name)));
        }
      }
    }
  }

  // PATH command names as fallback.
  for (const name of names) {
    candidates.push(name);
    candidates.push(appendExeIfNeeded(name));
  }

  const bareCommands: string[] = [];
  for (const candidate of candidates) {
    const isBareCommand = !candidate.includes('\\') && !candidate.includes('/');
    if (isBareCommand) {
      bareCommands.push(candidate);
      continue;
    }
    if (await fileExists(candidate)) return candidate;
  }

  for (const cmd of bareCommands) {
    if (await commandExists(cmd)) {
      return cmd;
    }
  }

  const hint =
    kind === 'dump'
      ? 'Set MYSQLDUMP_PATH to mysqldump/mariadb-dump full path.'
      : 'Set MYSQL_PATH to mysql/mariadb full path.';
  throw new Error(`Database binary not found. ${hint}`);
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

  let dumpCmd: string | null = null;
  try {
    dumpCmd = await resolveDbBinary('dump');
  } catch (error) {
    console.warn('[database-backup] dump binary not found, falling back to SQL query backup:', error);
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

  let mysqlCmd: string;
  try {
    mysqlCmd = await resolveDbBinary('client');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database client binary not found';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const normalizeClientError = (errorMessage: string) => {
    if (errorMessage.includes('ENOENT')) {
      return 'Database client tool not found. Set MYSQL_PATH to full path of mysql.exe or mariadb.exe.';
    }
    return errorMessage;
  };

  const runMysql = (sqlText: string) =>
    new Promise<void>((resolve, reject) => {
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
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  } finally {
    try {
      await fsPromises.unlink(tmpPath);
    } catch {
      // ignore
    }
  }
}

