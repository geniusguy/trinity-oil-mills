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
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
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
    log_file: '/var/log/pm2/api.trinityoil.in.log'
  }]
};
