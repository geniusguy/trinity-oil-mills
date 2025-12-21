// Quick script to check what environment variables Next.js would see
const path = require('path');
const fs = require('fs');

console.log('🔍 Checking environment files...\n');

// Check .env.local in oil-shop-web (what Next.js uses)
const localEnvPath = path.join(__dirname, '.env.local');
if (fs.existsSync(localEnvPath)) {
  console.log('✅ Found .env.local in oil-shop-web/');
  const content = fs.readFileSync(localEnvPath, 'utf8');
  const dbUrl = content.split('\n').find(line => line.startsWith('DATABASE_URL'));
  if (dbUrl) {
    const masked = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log('   ' + masked);
  }
} else {
  console.log('❌ .env.local NOT found in oil-shop-web/');
  console.log('   Next.js needs this file to load DATABASE_URL!');
}

// Check root env.local
const rootEnvPath = path.join(__dirname, '..', 'env.local');
if (fs.existsSync(rootEnvPath)) {
  console.log('\n✅ Found env.local in root/');
  const content = fs.readFileSync(rootEnvPath, 'utf8');
  const dbUrl = content.split('\n').find(line => line.startsWith('DATABASE_URL'));
  if (dbUrl) {
    const masked = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log('   ' + masked);
  }
}

console.log('\n💡 Next.js automatically loads .env.local from the oil-shop-web directory');
console.log('   Make sure your Next.js app is restarted after creating .env.local\n');

