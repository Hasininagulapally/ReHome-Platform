import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const DB_NAME = process.env.MYSQL_DATABASE || 'rehome_test';

const CATEGORIES = ['Furniture', 'Electronics', 'Appliances', 'Books', 'Kitchen', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Gently Used', 'Good', 'Fair'];
const CITIES = [
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 }
];

const ITEM_TITLES = [
  'Wooden Dining Table with 4 Chairs',
  'Ergonomic High Back Office Desk Chair',
  'Samsung 43 Inch 4K Smart LED TV',
  'LG 260L Double Door Frost Free Refrigerator',
  'Whirlpool 7kg Fully Automatic Washing Machine',
  'Prestige 3 Burner Gas Stove Glass Top',
  'Microwave Oven 20L Convection Grill',
  'Solid Teak Wood Bookshelf 5 Tier',
  'Comfortable 3 Seater Fabric Sofa Grey',
  'King Size Engineered Wood Bed with Storage',
  'Study Desk with Drawers and Bookshelf',
  'Philips Air Fryer Digital 4.1L',
  'Apple iPad 9th Gen 64GB WiFi Space Grey',
  'Sony Wireless Noise Cancelling Headphones WH-1000XM4',
  'Set of 10 Fiction and Non-Fiction Classic Books',
  'Stainless Steel Cookware Set 5 Pieces',
  'Pedestal Fan with Remote High Speed',
  'Foldable Camp Bed Metal Frame',
  'Exercise Bicycle Stationary Gym Bike',
  'Acoustic Guitar with Gig Bag and Tuner'
];

async function seedBenchmarkData() {
  console.log(`[Benchmark Seeder] Connecting to MySQL database '${DB_NAME}'...`);
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: DB_NAME
  });

  try {
    console.log('[Benchmark Seeder] Clearing existing data in rehome_test...');
    await conn.query('DELETE FROM items');
    await conn.query('DELETE FROM users');

    // 1. Generate 1,000 users
    console.log('[Benchmark Seeder] Seeding 1,000 users...');
    const hashedPassword = await bcrypt.hash('password123', 8);
    const userIds = [];
    const userRows = [];

    for (let i = 1; i <= 1000; i++) {
      const id = randomUUID();
      userIds.push(id);
      const cityObj = CITIES[i % CITIES.length];
      const lat = cityObj.lat + (Math.random() - 0.5) * 0.1;
      const lng = cityObj.lng + (Math.random() - 0.5) * 0.1;
      userRows.push([
        id,
        `User ${i}`,
        `benchmark_user_${i}@rehome.test`,
        hashedPassword,
        `+91 98000${String(i).padStart(5, '0')}`,
        `Sector ${i % 20}, Street ${i % 10}`,
        cityObj.name,
        lat.toFixed(7),
        lng.toFixed(7),
        i === 1 ? 'admin' : 'user'
      ]);
    }

    const userBatchSize = 500;
    for (let i = 0; i < userRows.length; i += userBatchSize) {
      const batch = userRows.slice(i, i + userBatchSize);
      await conn.query(
        'INSERT INTO users (id, name, email, password, phone, address, city, latitude, longitude, role) VALUES ?',
        [batch]
      );
    }
    console.log(`[Benchmark Seeder] Successfully inserted ${userRows.length} users.`);

    // 2. Generate 10,000 items
    console.log('[Benchmark Seeder] Seeding 10,000 items...');
    const itemRows = [];
    const sampleImagesJson = JSON.stringify([
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'
    ]);

    for (let i = 1; i <= 10000; i++) {
      const id = randomUUID();
      const ownerId = userIds[i % userIds.length];
      const titleTemplate = ITEM_TITLES[i % ITEM_TITLES.length];
      const title = `${titleTemplate} #${i}`;
      const description = `This is a high quality ${titleTemplate.toLowerCase()} in excellent shape. Well maintained, used gently, available for immediate pickup or delivery. Listing number ${i}.`;
      const category = CATEGORIES[i % CATEGORIES.length];
      const isFree = i % 5 === 0 ? 1 : 0;
      const price = isFree ? 0 : (10 + (i % 200));
      const condition = CONDITIONS[i % CONDITIONS.length];
      const status = i % 10 === 0 ? 'Reserved' : (i % 25 === 0 ? 'Given Away' : 'Available');
      const cityObj = CITIES[i % CITIES.length];
      // Jitter lat/lng within ~15km radius
      const lat = cityObj.lat + (Math.random() - 0.5) * 0.15;
      const lng = cityObj.lng + (Math.random() - 0.5) * 0.15;

      itemRows.push([
        id,
        title,
        description,
        category,
        price,
        isFree,
        condition,
        sampleImagesJson,
        ownerId,
        `Street ${i % 50}, Ward ${i % 15}`,
        cityObj.name,
        lat.toFixed(7),
        lng.toFixed(7),
        status
      ]);
    }

    const itemBatchSize = 1000;
    for (let i = 0; i < itemRows.length; i += itemBatchSize) {
      const batch = itemRows.slice(i, i + itemBatchSize);
      await conn.query(
        'INSERT INTO items (id, title, description, category, price, isFree, `condition`, images, owner, address, city, latitude, longitude, status) VALUES ?',
        [batch]
      );
    }
    console.log(`[Benchmark Seeder] Successfully inserted ${itemRows.length} items.`);

    // Quick verification
    const [[{ userCount }]] = await conn.query('SELECT COUNT(*) as userCount FROM users');
    const [[{ itemCount }]] = await conn.query('SELECT COUNT(*) as itemCount FROM items');
    console.log(`[Benchmark Seeder] Verification: ${userCount} users, ${itemCount} items in '${DB_NAME}'.`);

    await conn.end();
    console.log('[Benchmark Seeder] Done!');
  } catch (err) {
    console.error('[Benchmark Seeder] Error:', err);
    await conn.end();
    process.exit(1);
  }
}

seedBenchmarkData();
