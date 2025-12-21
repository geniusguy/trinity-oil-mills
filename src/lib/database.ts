import mysql from 'mysql2/promise';

// Parse DATABASE_URL or use individual env vars as fallback
export const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
      };
    } catch (error) {
      console.error('Error parsing DATABASE_URL:', error);
    }
  }
  
  // Fallback to individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trinityoil_oil_shop_db_new',
  };
};

export const createConnection = async () => {
  const config = getDatabaseConfig();
  return await mysql.createConnection(config);
};
