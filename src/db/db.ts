import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { getDatabaseConfig } from '../lib/database';

const config = getDatabaseConfig();

const connection = mysql.createPool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
});

export const db = drizzle(connection, { schema, mode: 'default' });
