import mysql from 'mysql2/promise';

// Parse DATABASE_URL or use individual env vars as fallback
export const getDatabaseConfig = () => {
  // Debug: Log what we have
  console.log('[DB] Checking DATABASE_URL:', process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.substring(0, 30) + '...)' : 'NOT SET ❌');
  
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const config = {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
      };
      console.log('[DB] Using DATABASE_URL - host:', config.host, 'database:', config.database);
      return config;
    } catch (error) {
      console.error('[DB] Error parsing DATABASE_URL:', error);
      if (error instanceof Error) {
        console.error('[DB] Error message:', error.message);
        console.error('[DB] DATABASE_URL value:', process.env.DATABASE_URL);
      }
    }
  } else {
    console.error('[DB] DATABASE_URL is NOT SET in process.env!');
    console.error('[DB] Available env vars with DB:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('DATABASE')));
  }
  
  // Fallback to individual environment variables
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trinityoil_oil_shop_db_new',
  };
  console.log('[DB] Using individual env vars - host:', config.host, 'database:', config.database);
  return config;
};

export const createConnection = async () => {
  try {
    const config = getDatabaseConfig();
    console.log('[DB] Attempting connection to:', config.host, ':', config.port, 'database:', config.database);
    const connection = await mysql.createConnection(config);
    console.log('[DB] Connection established successfully');
    return connection;
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    if (error instanceof Error) {
      console.error('[DB] Error message:', error.message);
      console.error('[DB] Error stack:', error.stack);
    }
    throw error;
  }
};
