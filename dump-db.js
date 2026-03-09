// Simple MySQL -> .sql dump using mysql2, no mysqldump binary needed
// Output: db-backup_<db>_<YYYYMMDD_HHMMSS>.sql in this folder

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

async function main() {
  // Load env: try oil-shop-web folder first, then parent
  const envPaths = [
    path.resolve(__dirname, '.env.local'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '..', 'env.local'),
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '.env.production'),
    path.resolve(__dirname, '..', 'env.production'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      console.log('Using env:', p);
      break;
    }
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not set in env.local / env.production / .env');
  }

  const url = new URL(dbUrl);
  const host = url.hostname || 'localhost';
  const port = url.port ? Number(url.port) : 3306;
  const user = decodeURIComponent(url.username || 'root');
  const password = decodeURIComponent(url.password || '');
  const database = url.pathname.replace(/^\//, '');

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '');
  const outFile = path.resolve(
    __dirname,
    `db-backup_${database}_${timestamp}.sql`,
  );

  console.log(
    `Connecting to MySQL ${user}@${host}:${port}/${database} to create dump...`,
  );

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });

  const writeStream = fs.createWriteStream(outFile, { encoding: 'utf8' });

  const header = [
    '-- Trinity Oil Mills DB backup',
    `-- Database: ${database}`,
    `-- Host: ${host}`,
    `-- Date: ${new Date().toISOString()}`,
    '',
    'SET FOREIGN_KEY_CHECKS=0;',
    '',
  ].join('\n');
  writeStream.write(header + '\n');

  // Get all tables
  const [tablesRows] = await connection.query('SHOW TABLES');
  const tableKey = Object.keys(tablesRows[0] || {})[0];
  const tables = tablesRows.map((row) => row[tableKey]);

  for (const table of tables) {
    console.log(`Dumping table: ${table}`);

    // DDL
    const [createRows] = await connection.query('SHOW CREATE TABLE ??', [
      table,
    ]);
    const createSql = createRows[0]['Create Table'] || createRows[0]['Create Table'.toLowerCase()];

    writeStream.write(`\n-- ----------------------------\n`);
    writeStream.write(`-- Table structure for \`${table}\`\n`);
    writeStream.write(`-- ----------------------------\n`);
    writeStream.write(`DROP TABLE IF EXISTS \`${table}\`;\n`);
    writeStream.write(createSql + ';\n');

    // Data
    const [rows] = await connection.query('SELECT * FROM ??', [table]);
    if (rows.length > 0) {
      writeStream.write(
        `\n-- ----------------------------\n-- Records of \`${table}\`\n-- ----------------------------\n`,
      );
      for (const row of rows) {
        const cols = Object.keys(row)
          .map((c) => `\`${c}\``)
          .join(', ');
        const vals = Object.values(row)
          .map((v) => escapeValue(v))
          .join(', ');
        writeStream.write(
          `INSERT INTO \`${table}\` (${cols}) VALUES (${vals});\n`,
        );
      }
    }
  }

  writeStream.write('\nSET FOREIGN_KEY_CHECKS=1;\n');
  await new Promise((res) => writeStream.end(res));
  await connection.end();

  console.log(`✅ Backup complete: ${outFile}`);
}

function escapeValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  // Dates and buffers -> string
  if (v instanceof Date) return `'${v.toISOString().replace('T', ' ').replace(/\..+/, '')}'`;
  if (Buffer.isBuffer(v)) return `'${v.toString('base64')}'`;
  const s = String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${s}'`;
}

main().catch((err) => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});

