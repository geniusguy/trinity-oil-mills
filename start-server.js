#!/usr/bin/env node

// This script loads .env.production and starts Next.js
// It ensures environment variables are loaded before Next.js starts

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const cron = require('node-cron');

// Load .env.production
function loadEnvFile() {
  // First, check if .env exists and warn about it
  const envPathLocal = path.join(__dirname, '.env');
  if (fs.existsSync(envPathLocal)) {
    console.warn('⚠️  WARNING: .env file found! It may override .env.production values.');
    console.warn('   Consider removing .env file or renaming it to .env.backup');
  }

  const possiblePaths = [
    path.join(__dirname, '.env.production'),
    path.join('/home/trinityoil/public_html', '.env.production'),
    '.env.production'
  ];

  let envPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      envPath = possiblePath;
      break;
    }
  }

  if (!envPath) {
    console.error('❌ .env.production not found!');
    process.exit(1);
  }

  console.log(`📁 Loading .env.production from: ${envPath}`);
  
  // Read file with different encodings to handle BOM and encoding issues
  let envContent;
  let encoding = 'utf8';
  
  // Check if file is UTF-16 by reading first few bytes
  const buffer = fs.readFileSync(envPath);
  if (buffer.length >= 2) {
    // Check for UTF-16 BOM
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      // UTF-16 LE BOM
      encoding = 'utf16le';
      console.log('   📝 Detected UTF-16 LE encoding');
    } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      // UTF-16 BE BOM
      encoding = 'utf16le'; // Node.js uses LE for utf16le
      console.log('   📝 Detected UTF-16 BE encoding (converting to LE)');
    } else if (buffer[0] === 0x00 && buffer[1] !== 0x00) {
      // Likely UTF-16 LE without BOM (starts with null byte)
      encoding = 'utf16le';
      console.log('   📝 Detected UTF-16 LE encoding (no BOM)');
    }
  }
  
  try {
    if (encoding === 'utf16le') {
      envContent = buffer.toString('utf16le');
    } else {
      envContent = buffer.toString('utf8');
    }
  } catch (error) {
    // Fallback to latin1 if UTF-8 fails
    console.warn('   Warning: UTF-8 read failed, trying latin1...');
    envContent = buffer.toString('latin1');
  }
  
  // Remove BOM (Byte Order Mark) if present - check multiple BOM types
  if (envContent.length > 0) {
    const firstChar = envContent.charCodeAt(0);
    if (firstChar === 0xFEFF || firstChar === 0xFFFE) {
      envContent = envContent.slice(1);
      console.log('   Removed BOM from file');
    }
    // Also check for UTF-8 BOM bytes
    if (envContent.startsWith('\uFEFF')) {
      envContent = envContent.replace(/^\uFEFF/, '');
      console.log('   Removed UTF-8 BOM from file');
    }
  }
  
  // Clean up any invisible characters
  envContent = envContent.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  const lines = envContent.split(/\r?\n/); // Handle both \n and \r\n
  let loaded = 0;
  let databaseUrlFound = false;
  let databaseUrlLine = null;
  let currentKey = null;
  let currentValue = null;
  let currentLineStart = null;

  console.log(`   Processing ${lines.length} lines from file...`);
  console.log(`   Looking for: AUTH_SECRET, NEXTAUTH_SECRET, DATABASE_URL, etc.`);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Remove any remaining BOM or invisible characters from line
    line = line.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    const trimmed = line.trim();
    
    // Skip comments (lines starting with #)
    if (trimmed.startsWith('#')) {
      // If we were building a value, finish it before the comment
      if (currentKey && currentValue !== null) {
        const finalValue = currentValue.trim();
        process.env[currentKey] = finalValue;
        if (currentKey.toUpperCase() === 'DATABASE_URL') {
          databaseUrlFound = true;
          databaseUrlLine = currentLineStart;
          const masked = finalValue.replace(/:[^:@]+@/, ':****@');
          console.log(`   ✅ DATABASE_URL completed (from line ${currentLineStart}): ${masked.substring(0, 80)}`);
        }
        loaded++;
        currentKey = null;
        currentValue = null;
        currentLineStart = null;
      }
      // Log if DATABASE_URL is in a comment
      if (trimmed.toUpperCase().includes('DATABASE_URL')) {
        console.log(`   ⚠️  DATABASE_URL found in comment at line ${i + 1}: "${trimmed.substring(0, 60)}..."`);
      }
      continue;
    }
    
    // Skip completely empty lines (but continue building value if we have one)
    if (!trimmed) {
      // If we're building a value and hit empty line, finish it
      if (currentKey && currentValue !== null) {
        const finalValue = currentValue.trim();
        process.env[currentKey] = finalValue;
        if (currentKey.toUpperCase() === 'DATABASE_URL') {
          databaseUrlFound = true;
          databaseUrlLine = currentLineStart;
          const masked = finalValue.replace(/:[^:@]+@/, ':****@');
          console.log(`   ✅ DATABASE_URL completed (from line ${currentLineStart}): ${masked.substring(0, 80)}`);
        }
        loaded++;
        currentKey = null;
        currentValue = null;
        currentLineStart = null;
      }
      continue;
    }

    // Check if this line continues a previous value (no = sign and we have a current key)
    if (currentKey && !trimmed.includes('=')) {
      // This line continues the previous value (multi-line value)
      currentValue += trimmed;
      continue;
    }

    // Find equals sign - handle cases with spaces around =
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      // Finish previous key-value pair if any
      if (currentKey && currentValue !== null) {
        const finalValue = currentValue.trim();
        process.env[currentKey] = finalValue;
        if (currentKey.toUpperCase() === 'DATABASE_URL') {
          databaseUrlFound = true;
          databaseUrlLine = currentLineStart;
          const masked = finalValue.replace(/:[^:@]+@/, ':****@');
          console.log(`   ✅ DATABASE_URL completed (from line ${currentLineStart}): ${masked.substring(0, 80)}`);
        }
        loaded++;
      }
      
      const key = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      
      // Remove quotes if present (handle both single and double quotes)
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Special handling for DATABASE_URL
      const keyUpper = key.toUpperCase();
      if (keyUpper === 'DATABASE_URL' || keyUpper.startsWith('DATABASE_URL')) {
        console.log(`   ✅ Found DATABASE_URL at line ${i + 1}`);
        console.log(`   Key: "${key}"`);
        console.log(`   Value (raw): "${value}" (length: ${value.length})`);
        
        // Check for hidden line breaks or special characters in the value
        if (value.includes('\n') || value.includes('\r')) {
          console.log(`   ⚠️  Value contains line break characters! Removing them...`);
          value = value.replace(/[\r\n]+/g, '');
        }
        
        // Remove any invisible characters
        value = value.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        // Check if value looks incomplete (common patterns for MySQL URLs)
        // MySQL URL should have: mysql://user:pass@host:port/dbname
        const isComplete = value.includes('://') && value.includes('@') && value.includes('/') && 
                          (value.includes(':3306') || value.match(/@[^:]+:\d+\//) || value.match(/@[^/]+\//));
        
        if (!isComplete && value.length > 0) {
          console.log(`   ⚠️  Value appears incomplete (length: ${value.length}), checking next line for continuation...`);
          console.log(`   Value ends with: "${value.substring(Math.max(0, value.length - 20))}"`);
          // Store as current key-value to check if next line continues it
          currentKey = key;
          currentValue = value;
          currentLineStart = i + 1;
        } else {
          // Value looks complete
          databaseUrlFound = true;
          databaseUrlLine = i + 1;
          const masked = value.replace(/:[^:@]+@/, ':****@');
          console.log(`   ✅ Value is complete (length: ${value.length})`);
          console.log(`   Value (masked): ${masked.substring(0, 80)}`);
          process.env[key] = value;
          loaded++;
          currentKey = null;
          currentValue = null;
          currentLineStart = null;
        }
      } else {
        // Regular key-value pair
        // Special logging for AUTH_SECRET and NEXTAUTH_SECRET
        if (keyUpper === 'AUTH_SECRET' || keyUpper === 'NEXTAUTH_SECRET') {
          console.log(`   ✅ Found ${key} at line ${i + 1}`);
          console.log(`   Value length: ${value.length}`);
          if (value.length > 0) {
            console.log(`   Value (first 20 chars): ${value.substring(0, 20)}...`);
          } else {
            console.log(`   ⚠️  Value is EMPTY!`);
          }
        }
        process.env[key] = value;
        loaded++;
        currentKey = null;
        currentValue = null;
        currentLineStart = null;
      }
    } else {
      // Line doesn't have =, might continue previous value
      if (currentKey && currentValue !== null) {
        currentValue += trimmed;
        continue;
      }
      
      // Log lines that might contain DATABASE_URL but can't be parsed
      const upperLine = trimmed.toUpperCase();
      if (upperLine.includes('DATABASE') && !upperLine.startsWith('#')) {
        console.log(`   ⚠️  Found DATABASE-related text at line ${i + 1} but can't parse:`);
        console.log(`   Raw line: "${line.substring(0, 100)}"`);
        console.log(`   Has =: ${line.includes('=')}`);
        console.log(`   Trimmed: "${trimmed.substring(0, 100)}"`);
      }
    }
  }
  
  // Finish any remaining key-value pair
  if (currentKey && currentValue !== null) {
    const finalValue = currentValue.trim();
    process.env[currentKey] = finalValue;
    if (currentKey.toUpperCase() === 'DATABASE_URL') {
      databaseUrlFound = true;
      databaseUrlLine = currentLineStart || lines.length;
      const masked = finalValue.replace(/:[^:@]+@/, ':****@');
      console.log(`   ✅ DATABASE_URL completed (from line ${currentLineStart}): ${masked.substring(0, 80)}`);
    }
    loaded++;
  }
  
  if (!databaseUrlFound) {
    console.error(`   ❌ DATABASE_URL not found in .env.production file!`);
    console.error(`   `);
    console.error(`   Debugging info:`);
    console.error(`   - File path: ${envPath}`);
    console.error(`   - File size: ${fs.statSync(envPath).size} bytes`);
    console.error(`   - Total lines: ${lines.length}`);
    console.error(`   - Loaded variables: ${loaded}`);
    console.error(`   `);
    console.error(`   Searching for any DATABASE-related content...`);
    
    // Search for any mention of DATABASE in the file
    const allDatabaseLines = [];
    for (let i = 0; i < lines.length; i++) {
      const upperLine = lines[i].toUpperCase();
      if (upperLine.includes('DATABASE')) {
        allDatabaseLines.push({ line: i + 1, content: lines[i] });
      }
    }
    
    if (allDatabaseLines.length > 0) {
      console.error(`   Found ${allDatabaseLines.length} line(s) containing 'DATABASE':`);
      allDatabaseLines.forEach(({ line, content }) => {
        console.error(`   Line ${line}: "${content.substring(0, 100)}"`);
        console.error(`   - Is comment: ${content.trim().startsWith('#')}`);
        console.error(`   - Has =: ${content.includes('=')}`);
        console.error(`   - Hex: ${Buffer.from(content).toString('hex').substring(0, 60)}`);
      });
    } else {
      console.error(`   ❌ No lines containing 'DATABASE' found at all!`);
    }
    
    console.error(`   `);
    console.error(`   Please check your .env.production file and ensure DATABASE_URL is set.`);
    console.error(`   Format: DATABASE_URL=mysql://user:pass@host:3306/dbname`);
  } else {
    console.log(`   ✅ DATABASE_URL successfully loaded from line ${databaseUrlLine}`);
  }

  console.log(`✅ Loaded ${loaded} environment variables`);
  
  // Debug: Check if AUTH_SECRET was loaded
  if (process.env.AUTH_SECRET) {
    console.log(`✅ AUTH_SECRET: Loaded from .env.production (${process.env.AUTH_SECRET.length} chars)`);
  } else if (process.env.NEXTAUTH_SECRET) {
    console.log(`✅ NEXTAUTH_SECRET: Loaded from .env.production (${process.env.NEXTAUTH_SECRET.length} chars)`);
    console.log(`   (Will be used as AUTH_SECRET)`);
  } else {
    console.log(`⚠️  AUTH_SECRET: NOT found in .env.production`);
    console.log(`   Checking all loaded keys containing 'AUTH' or 'SECRET':`);
    const authKeys = Object.keys(process.env).filter(k => 
      k.toUpperCase().includes('AUTH') || k.toUpperCase().includes('SECRET')
    );
    if (authKeys.length > 0) {
      authKeys.forEach(k => {
        console.log(`   - ${k}: ${process.env[k] ? 'SET (' + process.env[k].length + ' chars)' : 'NOT SET'}`);
      });
    } else {
      console.log(`   - No AUTH or SECRET keys found`);
    }
  }
  
  // Critical: Check if DATABASE_URL was loaded
  if (process.env.DATABASE_URL) {
    const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
    console.log(`✅ DATABASE_URL: SET (${masked})`);
  } else {
    console.error(`❌ CRITICAL ERROR: DATABASE_URL is NOT SET!`);
    console.error(`   Database connection will fail without this variable.`);
    console.error(`   `);
    console.error(`   SOLUTION: Add DATABASE_URL to your .env.production file`);
    console.error(`   `);
    console.error(`   Format: DATABASE_URL=mysql://username:password@host:3306/database_name`);
    console.error(`   `);
    console.error(`   Example:`);
    console.error(`   DATABASE_URL=mysql://root:mypassword@localhost:3306/trinityoil_oil_shop_db_new`);
    console.error(`   `);
    console.error(`   You can use the add-database-url.sh script to add it interactively.`);
    console.error(`   Or manually edit .env.production and add the DATABASE_URL line.`);
    console.error(`   `);
    process.exit(1); // Exit - don't start server without database connection
  }
  
  return true;
}

// Load environment variables
loadEnvFile();

// Start Next.js with loaded environment variables
console.log('🚀 Starting Next.js server...');
console.log(`   PORT: ${process.env.PORT || '3001'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
console.log(`   DATABASE_URL before spawn: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);

// Create a clean environment object with .env.production values taking precedence
// This ensures .env.production values override any .env values that Next.js might load
const productionEnv = {
  // Start with system environment variables
  ...process.env,
  // Override with .env.production values (these take highest priority)
  DATABASE_URL: process.env.DATABASE_URL,  // From .env.production
  NODE_ENV: 'production',  // Always production when using start-server.js
  PORT: process.env.PORT || '3001',
  // Auth.js v5 required variables (from .env.production)
  AUTH_SECRET: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  AUTH_URL: process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'https://api.trinityoil.in',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://api.trinityoil.in',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

// Log critical variables to verify they're set correctly
console.log('🔍 Environment variables verification:');
console.log(`   NODE_ENV: ${productionEnv.NODE_ENV}`);
console.log(`   PORT: ${productionEnv.PORT}`);
console.log(`   DATABASE_URL: ${productionEnv.DATABASE_URL ? 'SET (' + productionEnv.DATABASE_URL.substring(0, 30) + '...)' : 'NOT SET ❌'}`);

// Check AUTH_SECRET - Auth.js v5 requires this
const authSecret = productionEnv.AUTH_SECRET || productionEnv.NEXTAUTH_SECRET;
if (authSecret) {
  console.log(`   AUTH_SECRET: SET (${authSecret.length} chars)`);
} else {
  console.log(`   AUTH_SECRET: NOT SET ❌`);
  console.log(`   ⚠️  AUTH_SECRET or NEXTAUTH_SECRET is required for Auth.js v5!`);
  console.log(`   Checking loaded env vars...`);
  console.log(`   - process.env.AUTH_SECRET: ${process.env.AUTH_SECRET ? 'SET' : 'NOT SET'}`);
  console.log(`   - process.env.NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET'}`);
  console.log(`   `);
  console.log(`   Please add AUTH_SECRET or NEXTAUTH_SECRET to .env.production`);
  console.log(`   Example: AUTH_SECRET=your-secret-key-here`);
}

const authUrl = productionEnv.AUTH_URL || productionEnv.NEXTAUTH_URL;
console.log(`   AUTH_URL: ${authUrl || 'NOT SET ❌'}`);

// Ensure AUTH_SECRET is always set (Auth.js v5 requirement)
// Use fallback if not found in .env.production
const finalAuthSecret = productionEnv.AUTH_SECRET || productionEnv.NEXTAUTH_SECRET || 'trinity-oil-mills-super-secret-key-2024-production';
if (!productionEnv.AUTH_SECRET && !productionEnv.NEXTAUTH_SECRET) {
  console.log(`   ⚠️  Using fallback AUTH_SECRET (add AUTH_SECRET or NEXTAUTH_SECRET to .env.production)`);
}

// Explicitly pass all environment variables with ensured AUTH_SECRET and DATABASE_URL
const nextEnv = {
  ...productionEnv,
  // Ensure AUTH_SECRET is always set (Auth.js v5 requirement)
  AUTH_SECRET: finalAuthSecret,
  AUTH_URL: productionEnv.AUTH_URL || productionEnv.NEXTAUTH_URL || 'https://api.trinityoil.in',
  NEXTAUTH_SECRET: finalAuthSecret,
  NEXTAUTH_URL: productionEnv.NEXTAUTH_URL || productionEnv.AUTH_URL || 'https://api.trinityoil.in',
  // Explicitly ensure DATABASE_URL is passed (CRITICAL for database connections)
  DATABASE_URL: productionEnv.DATABASE_URL || process.env.DATABASE_URL || '',
};

// Log critical env vars being passed to Next.js
console.log('📤 Passing environment variables to Next.js:');
console.log(`   DATABASE_URL: ${nextEnv.DATABASE_URL ? 'SET (' + nextEnv.DATABASE_URL.substring(0, 30) + '...)' : 'NOT SET ❌'}`);
console.log(`   AUTH_SECRET: ${nextEnv.AUTH_SECRET ? 'SET' : 'NOT SET ❌'}`);
console.log(`   NODE_ENV: ${nextEnv.NODE_ENV}`);

const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const nextProcess = spawn('node', [nextBin, 'start', '-p', productionEnv.PORT || '3001'], {
  stdio: 'inherit',
  env: nextEnv,
  cwd: __dirname,
  shell: false
});

// Daily backup at 00:00 (Asia/Kolkata) – dump DB and email to rvkiran@yahoo.com
const backupScript = path.join(__dirname, 'scripts', 'backup-and-email.js');
if (fs.existsSync(backupScript)) {
  cron.schedule('0 0 * * *', () => {
    console.log('[backup] Running scheduled daily backup at', new Date().toISOString());
    const child = spawn('node', [backupScript], { stdio: 'inherit', env: nextEnv, cwd: __dirname, shell: false });
    child.on('close', (code) => { if (code !== 0) console.error('[backup] Backup exited with code', code); });
  }, { timezone: 'Asia/Kolkata' });
  console.log('📧 Daily DB backup scheduled at 00:00 (emailed to rvkiran@yahoo.com)');
}

nextProcess.on('error', (error) => {
  console.error('❌ Failed to start Next.js:', error);
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  process.exit(code);
});


