module.exports = {
  apps: [{
    name: 'api.trinityoil.in',
    script: 'npm',
    args: 'start',
    cwd: '/home/trinityoil/public_html',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_file: '.env.production',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/api.trinityoil.in-error.log',
    out_file: '/var/log/pm2/api.trinityoil.in-out.log',
    log_file: '/var/log/pm2/api.trinityoil.in.log'
  }]
};
