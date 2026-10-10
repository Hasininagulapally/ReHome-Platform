import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const getDbName = () => {
  if (process.env.NODE_ENV === 'test') {
    return process.env.MYSQL_DATABASE || 'rehome_test';
  }
  return process.env.MYSQL_DATABASE || 'rehome';
};

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: getDbName(),
  waitForConnections: true,
  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT, 10) || 50,
  queueLimit: 0,
  decimalNumbers: true
});

export const initMySQL = async (customDbName) => {
  const dbName = customDbName || getDbName();
  try {
    // 1. Ensure database exists
    const rootConn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || ''
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConn.end();

    // 2. Ensure tables exist (Idempotent)
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: dbName
    });

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(191) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50) DEFAULT '',
        address VARCHAR(255) DEFAULT '',
        city VARCHAR(100) DEFAULT '',
        latitude DECIMAL(10, 7) DEFAULT 0,
        longitude DECIMAL(10, 7) DEFAULT 0,
        role ENUM('user', 'admin') DEFAULT 'user',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) DEFAULT 0,
        isFree TINYINT(1) DEFAULT 0,
        \`condition\` VARCHAR(50) NOT NULL,
        images JSON,
        owner VARCHAR(36) NOT NULL,
        address VARCHAR(255) DEFAULT '',
        city VARCHAR(100) DEFAULT '',
        latitude DECIMAL(10, 7) DEFAULT 0,
        longitude DECIMAL(10, 7) DEFAULT 0,
        status ENUM('Available', 'Reserved', 'Given Away') DEFAULT 'Available',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_items_status (status),
        INDEX idx_items_category (category),
        INDEX idx_items_city (city),
        INDEX idx_items_created (createdAt),
        INDEX idx_items_lat_lng (latitude, longitude),
        INDEX idx_items_status_lat_lng (status, latitude, longitude),
        FULLTEXT INDEX idx_items_ft (title, description),
        CONSTRAINT fk_items_owner FOREIGN KEY (owner) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.end();

    console.log(`[MySQL] Connected to database '${dbName}' and verified tables`);
    return pool;
  } catch (error) {
    console.error(`[MySQL] Initialization error on '${dbName}': ${error.message}`);
    throw error;
  }
};

export default pool;
