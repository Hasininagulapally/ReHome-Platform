import { beforeAll, afterAll, beforeEach } from 'vitest';
import pool, { initMySQL, getDbName } from '../src/config/mysql.js';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MYSQL_DATABASE = 'rehome_test';
  process.env.JWT_SECRET = 'test_jwt_secret_rehome_key_12345';
  process.env.PORT = '5001';

  try {
    await initMySQL('rehome_test');
    console.log(`[Test Setup] MySQL test database '${getDbName()}' connected and ready`);
  } catch (err) {
    console.error('[Test Setup] Failed to connect to MySQL:', err);
    throw err;
  }
});

beforeEach(async () => {
  try {
    await pool.query('DELETE FROM items');
    await pool.query('DELETE FROM users');
  } catch (err) {
    console.error('[Test Setup] Error clearing tables:', err);
  }
});

afterAll(async () => {
  try {
    await pool.query('DELETE FROM items');
    await pool.query('DELETE FROM users');
  } catch {
    // Ignore cleanup error
  }
});
