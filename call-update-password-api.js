const http = require('http');

const data = JSON.stringify({
  email: 'admin@trinityoil.com',
  newPassword: 'admin@123',
  secret: 'TEMPORARY_UPDATE_2024'
});

// Try both common ports
const ports = [3000, 3001, 3002];

async function tryUpdatePassword(port) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/api/admin/update-admin-password-direct',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ port, status: res.statusCode, data: json });
        } catch (e) {
          resolve({ port, status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject({ port, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

async function updatePassword() {
  console.log('🔧 Attempting to update admin password via API...\n');
  
  for (const port of ports) {
    try {
      console.log(`Trying port ${port}...`);
      const result = await tryUpdatePassword(port);
      
      if (result.status === 200) {
        console.log(`\n✅ SUCCESS! Password updated on port ${port}`);
        console.log('Response:', JSON.stringify(result.data, null, 2));
        console.log('\n📧 You can now login with:');
        console.log('   Email: admin@trinityoil.com');
        console.log('   Password: admin@123\n');
        return;
      } else {
        console.log(`❌ Port ${port} returned status ${result.status}:`, result.data);
      }
    } catch (error) {
      console.log(`❌ Port ${port} error:`, error.error || error.message);
    }
  }
  
  console.log('\n⚠️  Could not connect to the API on any port.');
  console.log('Make sure your Next.js app is running.');
}

updatePassword();

