const fs = require('fs');
const path = require('path');

// Load .env.production file
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.production');
  const env = {
    NODE_ENV: 'production',
    PORT: 3001
  };

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
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
      }
    }
    console.log(`✅ Loaded environment variables from .env.production`);
  } else {
    console.warn(`⚠️  .env.production not found at ${envPath}`);
  }

  return env;
}

module.exports = {
  apps: [{
    name: 'api.trinityoil.in',
    script: 'npm',
    args: 'start',
    cwd: '/home/trinityoil/public_html',
    env: loadEnvFile(),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/api.trinityoil.in-error.log',
    out_file: '/var/log/pm2/api.trinityoil.in-out.log',
    log_file: '/var/log/pm2/api.trinityoil.in.log'
  }]
};
