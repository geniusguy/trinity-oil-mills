#!/usr/bin/env node

// Debug script to check .env.production parsing

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.production');

console.log('🔍 Debugging .env.production file...\n');
console.log('File path:', envPath);
console.log('Exists:', fs.existsSync(envPath));
console.log('');

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('File size:', content.length, 'bytes');
  console.log('Total lines:', content.split('\n').length);
  console.log('');
  
  // Find DATABASE_URL line
  const lines = content.split('\n');
  let found = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().toUpperCase().startsWith('DATABASE_URL')) {
      found = true;
      console.log(`✅ Found DATABASE_URL at line ${i + 1}:`);
      console.log(`   Raw: "${line}"`);
      console.log(`   Trimmed: "${line.trim()}"`);
      console.log(`   Length: ${line.length}`);
      console.log(`   Has =: ${line.includes('=')}`);
      
      // Try to parse
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        let value = line.substring(equalIndex + 1).trim();
        
        console.log(`   Key: "${key}"`);
        console.log(`   Value (raw): "${value}"`);
        console.log(`   Value length: ${value.length}`);
        
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
          console.log(`   Value (unquoted): "${value}"`);
        }
        
        // Test setting
        process.env.DATABASE_URL = value;
        console.log(`   ✅ Set process.env.DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
        if (process.env.DATABASE_URL) {
          const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
          console.log(`   Masked: ${masked}`);
        }
      }
      break;
    }
  }
  
  if (!found) {
    console.log('❌ DATABASE_URL not found in file!');
    console.log('\nFirst 10 lines of file:');
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`  ${i + 1}: ${line}`);
    });
  }
} else {
  console.log('❌ File does not exist!');
}

