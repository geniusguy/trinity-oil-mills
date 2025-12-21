#!/usr/bin/env node

// This script loads .env.production and starts Next.js
// It ensures environment variables are loaded before Next.js starts

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load .env.production
function loadEnvFile() {
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
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  let loaded = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      process.env[key] = value;
      loaded++;
    }
  }

  console.log(`✅ Loaded ${loaded} environment variables`);
  
  // Debug: Check if DATABASE_URL was loaded
  if (process.env.DATABASE_URL) {
    const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
    console.log(`✅ DATABASE_URL: SET (${masked})`);
  } else {
    console.error(`❌ DATABASE_URL: NOT SET after loading!`);
    console.error(`   Checking .env.production file...`);
    
    // Re-read file to debug
    const content = fs.readFileSync(envPath, 'utf8');
    const dbLine = content.split('\n').find(line => 
      line.trim().toUpperCase().startsWith('DATABASE_URL')
    );
    
    if (dbLine) {
      console.error(`   Found DATABASE_URL line: ${dbLine.trim()}`);
      console.error(`   Line length: ${dbLine.length}`);
      console.error(`   Has equals: ${dbLine.includes('=')}`);
    } else {
      console.error(`   DATABASE_URL line NOT FOUND in file!`);
    }
    
    // List all loaded keys
    console.error(`   Loaded keys: ${Object.keys(process.env).filter(k => k.startsWith('DATABASE') || k.startsWith('DB_')).join(', ')}`);
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

// Explicitly pass all environment variables
const nextProcess = spawn('node', ['node_modules/.bin/next', 'start', '-p', process.env.PORT || '3001'], {
  stdio: 'inherit',
  env: {
    ...process.env,  // Spread all current env vars
    DATABASE_URL: process.env.DATABASE_URL,  // Explicitly set
    NODE_ENV: process.env.NODE_ENV || 'production',
    PORT: process.env.PORT || '3001'
  },
  cwd: __dirname,
  shell: false
});

nextProcess.on('error', (error) => {
  console.error('❌ Failed to start Next.js:', error);
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  process.exit(code);
});

