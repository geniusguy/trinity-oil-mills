console.log('Script is running!');
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);

const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env.local');
console.log('Looking for .env.local at:', envPath);
console.log('Exists:', fs.existsSync(envPath));

const rootEnvPath = path.join(__dirname, '..', 'env.local');
console.log('Looking for env.local at:', rootEnvPath);
console.log('Exists:', fs.existsSync(rootEnvPath));

