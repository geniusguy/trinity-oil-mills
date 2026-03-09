const fs = require('fs');
const path = require('path');

// Load .env.production file
function loadEnvFile() {
  // Try multiple paths - PM2 might run from different directory
  const possiblePaths = [
    path.join(__dirname, '.env.production'),
    path.join('/home/trinityoil/public_html', '.env.production'),
    '.env.production'
  ];
  
  const env = {
    NODE_ENV: 'production',
    PORT: 3001
  };

  let envPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      envPath = possiblePath;
      break;
    }
  }

  if (envPath) {
    console.log(`📁 Loading .env.production from: ${envPath}`);
    
    // Read file and detect encoding (same as start-server.js)
    const buffer = fs.readFileSync(envPath);
    let envContent;
    let encoding = 'utf8';
    
    // Check if file is UTF-16
    if (buffer.length >= 2) {
      if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        encoding = 'utf16le';
        console.log('   📝 Detected UTF-16 LE encoding');
      } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        encoding = 'utf16le';
        console.log('   📝 Detected UTF-16 BE encoding');
      } else if (buffer[0] === 0x00) {
        encoding = 'utf16le';
        console.log('   📝 Detected UTF-16 LE encoding (no BOM)');
      }
    }
    
    if (encoding === 'utf16le') {
      envContent = buffer.toString('utf16le');
    } else {
      envContent = buffer.toString('utf8');
    }
    
    // Remove BOM
    if (envContent.charCodeAt(0) === 0xFEFF) {
      envContent = envContent.slice(1);
    }
    envContent = envContent.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    const lines = envContent.split(/\r?\n/);
    let loaded = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
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
        env[key] = value;
        loaded++;
      }
    }
    console.log(`✅ Loaded ${loaded} environment variables from .env.production`);
    console.log(`✅ DATABASE_URL: ${env.DATABASE_URL ? 'SET (' + env.DATABASE_URL.substring(0, 20) + '...)' : 'NOT SET'}`);
  } else {
    console.error(`❌ .env.production not found in any of these locations:`);
    possiblePaths.forEach(p => console.error(`   - ${p}`));
  }

  return env;
}

const env = loadEnvFile();

module.exports = {
  apps: [{
    name: 'api.trinityoil.in',
    script: 'start-server.js',
    cwd: '/home/trinityoil/public_html',
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/api.trinityoil.in-error.log',
    out_file: '/var/log/pm2/api.trinityoil.in-out.log',
    log_file: '/var/log/pm2/api.trinityoil.in.log',
    // Pass environment variables to PM2
    env: {
      ...env,
      NODE_ENV: 'production',
      // Ensure Auth.js v5 required variables are set
      AUTH_SECRET: env.AUTH_SECRET || env.NEXTAUTH_SECRET,
      AUTH_URL: env.AUTH_URL || env.NEXTAUTH_URL || 'https://api.trinityoil.in',
      NEXTAUTH_URL: env.NEXTAUTH_URL || 'https://api.trinityoil.in',
      NEXTAUTH_SECRET: env.NEXTAUTH_SECRET || env.AUTH_SECRET,
      // Explicitly ensure DATABASE_URL is passed
      DATABASE_URL: env.DATABASE_URL || '',
    }
  }]
};
