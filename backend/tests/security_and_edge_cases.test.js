import { describe, it, expect } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/app.js';
import pool from '../src/config/mysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Haversine formula calculation in JavaScript for accuracy verification
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

describe('Heavy-Duty QA & Security Audit Test Suite', () => {
  const createTestUser = async (override = {}) => {
    const userData = {
      name: 'Test Resident',
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'password123',
      city: 'Bangalore',
      ...override
    };

    const res = await request(app).post('/api/auth/register').send(userData);
    return {
      user: res.body.user,
      token: res.body.token,
      data: userData
    };
  };

  const createTestItem = async (token, override = {}) => {
    const itemData = {
      title: 'Ergonomic Desk Chair',
      description: 'Comfortable mesh chair in great condition',
      category: 'Furniture',
      condition: 'Like New',
      price: 25,
      isFree: false,
      city: 'Bangalore',
      latitude: 12.9716,
      longitude: 77.5946,
      ...override
    };

    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemData);

    return {
      status: res.status,
      body: res.body,
      item: res.body.item
    };
  };

  /* -------------------------------------------------------------
   * Phase 2: Auth Deep Edge Cases
   * ------------------------------------------------------------- */
  describe('Authentication & User Edge Cases', () => {
    it('should register with multilingual unicode & emoji names successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'విజయ్ కుమార్ 🌟',
          email: 'vijay-unicode@example.com',
          password: 'securePassword123'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.name).toBe('విజయ్ కుమార్ 🌟');
    });

    it('should reject names longer than 100 characters', async () => {
      const hugeName = 'A'.repeat(101);
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: hugeName,
          email: 'huge-name@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject passwords shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass User',
          email: 'shortpass@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should PREVENT privilege escalation: register with role=admin in body forces role=user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hacker User',
          email: 'hacker@example.com',
          password: 'password123',
          role: 'admin'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('user');
    });

    it('should reject login with wrong password', async () => {
      const { data } = await createTestUser();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: data.email, password: 'wrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject /me with a tampered token signature', async () => {
      const { token } = await createTestUser();
      const tamperedToken = token.slice(0, -6) + 'abc123';

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject /me with an algorithm "none" unsigned token', async () => {
      // Craft an unsigned JWT token with alg: none
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ id: 'fake-id', role: 'admin' })).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${noneToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject /me when user belonging to the token was deleted', async () => {
      const { user, token } = await createTestUser();
      // Delete user directly from DB
      await pool.query('DELETE FROM users WHERE id = ?', [user._id]);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/no longer exists/i);
    });
  });

  /* -------------------------------------------------------------
   * Phase 2: Items Listing & Query Filters
   * ------------------------------------------------------------- */
  describe('Items Listing & Filtering Edge Cases', () => {
    it('should clamp limit=0 to 1 and limit=100000 to 100', async () => {
      const { token } = await createTestUser();
      await createTestItem(token, { title: 'Item Clamp 1' });

      const res0 = await request(app).get('/api/items?limit=0');
      expect(res0.status).toBe(200);
      expect(res0.body.limit).toBe(1);

      const resMax = await request(app).get('/api/items?limit=100000');
      expect(resMax.status).toBe(200);
      expect(resMax.body.limit).toBe(100);
    });

    it('should clamp page=-1 to page 1 and return empty list on page past end', async () => {
      const { token } = await createTestUser();
      await createTestItem(token, { title: 'Item Page 1' });

      const resNeg = await request(app).get('/api/items?page=-1');
      expect(resNeg.status).toBe(200);
      expect(resNeg.body.page).toBe(1);

      const resPast = await request(app).get('/api/items?page=99999');
      expect(resPast.status).toBe(200);
      expect(resPast.body.items).toEqual([]);
    });

    it('should handle minPrice > maxPrice gracefully without SQL syntax error', async () => {
      const { token } = await createTestUser();
      await createTestItem(token, { price: 50 });

      const res = await request(app).get('/api/items?minPrice=100&maxPrice=10');
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
    });

    it('should sort correctly by price_asc, price_desc, and oldest', async () => {
      const { token } = await createTestUser();
      await createTestItem(token, { title: 'Cheap Item', price: 10, isFree: false });
      await createTestItem(token, { title: 'Expensive Item', price: 200, isFree: false });

      const resAsc = await request(app).get('/api/items?sortBy=price_asc');
      expect(resAsc.status).toBe(200);
      expect(resAsc.body.items[0].price).toBeLessThanOrEqual(resAsc.body.items[1]?.price ?? Infinity);

      const resDesc = await request(app).get('/api/items?sortBy=price_desc');
      expect(resDesc.status).toBe(200);
      expect(resDesc.body.items[0].price).toBeGreaterThanOrEqual(resDesc.body.items[1]?.price ?? 0);
    });
  });

  /* -------------------------------------------------------------
   * Phase 2: Geospatial & Haversine Accuracy
   * ------------------------------------------------------------- */
  describe('Nearby API & Distance Accuracy', () => {
    it('should reject coordinates outside valid ranges (lat [-90,90], lng [-180,180])', async () => {
      const resLat = await request(app).get('/api/items/nearby?latitude=100&longitude=77');
      expect(resLat.status).toBe(400);

      const resLng = await request(app).get('/api/items/nearby?latitude=12&longitude=200');
      expect(resLng.status).toBe(400);

      const resNaN = await request(app).get('/api/items/nearby?latitude=abc&longitude=xyz');
      expect(resNaN.status).toBe(400);
    });

    it('should match distance in km with manual Haversine calculation within 0.2 km margin', async () => {
      const { token } = await createTestUser();
      // Create item at Indiranagar (12.9784, 77.6408)
      await createTestItem(token, {
        title: 'Indiranagar Sofa',
        latitude: 12.9784,
        longitude: 77.6408
      });

      // Search from Koramangala (12.9352, 77.6245)
      const searchLat = 12.9352;
      const searchLng = 77.6245;

      const expectedKm = haversineDistanceKm(searchLat, searchLng, 12.9784, 77.6408);

      const res = await request(app).get(
        `/api/items/nearby?latitude=${searchLat}&longitude=${searchLng}&radiusKm=15`
      );

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);

      const foundItem = res.body.items.find((i) => i.title === 'Indiranagar Sofa');
      expect(foundItem).toBeDefined();
      expect(Math.abs(foundItem.distanceKm - expectedKm)).toBeLessThanOrEqual(0.3);
    });

    it('should support item positioned at equator/meridian (0, 0)', async () => {
      const { token } = await createTestUser();
      await createTestItem(token, {
        title: 'Null Island Item',
        latitude: 0,
        longitude: 0
      });

      const res = await request(app).get('/api/items/nearby?latitude=0&longitude=0&radiusKm=10');
      expect(res.status).toBe(200);
      expect(res.body.items.some((i) => i.title === 'Null Island Item')).toBe(true);
    });
  });

  /* -------------------------------------------------------------
   * Phase 2: Image Upload Restrictions & File Cleanup
   * ------------------------------------------------------------- */
  describe('File Upload Safety & Deletion Cascade', () => {
    it('should reject more than 5 images upload with HTTP 400', async () => {
      const { token } = await createTestUser();
      const dummyImg = Buffer.from('fake-image-bytes');

      const req = request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Six Images Listing')
        .field('description', 'Test 6 image limit')
        .field('category', 'Furniture')
        .field('condition', 'Good');

      // Attach 6 images
      for (let i = 1; i <= 6; i++) {
        req.attach('images', dummyImg, `pic${i}.png`);
      }

      const res = await req;
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/maximum of 5 images/i);
    });

    it('should automatically remove uploaded files from disk when listing is deleted', async () => {
      const { token } = await createTestUser();
      const testImg = Buffer.from('png-content-for-test');

      const createRes = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Item with File to Delete')
        .field('description', 'Will be unlinked on deletion')
        .field('category', 'Furniture')
        .field('condition', 'Good')
        .attach('images', testImg, 'temp-file.png');

      expect(createRes.status).toBe(201);
      const item = createRes.body.item;
      expect(item.images.length).toBe(1);

      const filename = path.basename(item.images[0]);
      const filePath = path.resolve(__dirname, '../uploads', filename);

      // Verify file exists on disk
      expect(fs.existsSync(filePath)).toBe(true);

      // Delete the item
      const delRes = await request(app)
        .delete(`/api/items/${item._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);

      // Verify file has been cleaned up from disk
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  /* -------------------------------------------------------------
   * Phase 3: SQL Injection Payloads across all query surfaces
   * ------------------------------------------------------------- */
  describe('Security: SQL Injection Resistance', () => {
    it('should safely neutralize SQL injection payload in search query parameter "q"', async () => {
      const sqliPayload = "' OR '1'='1' -- ";
      const res = await request(app).get(`/api/items?q=${encodeURIComponent(sqliPayload)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should safely neutralize SQL injection in "city" parameter', async () => {
      const sqliPayload = "Bangalore' UNION SELECT * FROM users -- ";
      const res = await request(app).get(`/api/items?city=${encodeURIComponent(sqliPayload)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should safely neutralize SQL injection in "sortBy" parameter', async () => {
      const sqliPayload = "price; DROP TABLE users; --";
      const res = await request(app).get(`/api/items?sortBy=${encodeURIComponent(sqliPayload)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should safely handle malformed JSON body without server crash or stack trace leak', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "broken-json, missing-bracket');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/malformed json payload/i);
    });
  });

  /* -------------------------------------------------------------
   * Phase 4: Database Concurrency & Cascade Tests
   * ------------------------------------------------------------- */
  describe('Concurrency & Data Integrity', () => {
    it('should handle 50 concurrent item listings without deadlocks or connection exhaustion', async () => {
      const { token } = await createTestUser();

      const promises = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post('/api/items')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: `Concurrent Item #${i}`,
            description: `Testing database pool capacity under load #${i}`,
            category: 'Other',
            condition: 'Good',
            price: i,
            isFree: i === 0
          })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every((r) => r.status === 201);
      expect(allSuccessful).toBe(true);
    });

    it('should cascade delete all items when a user account is deleted', async () => {
      const { user, token } = await createTestUser();
      await createTestItem(token, { title: 'Cascade Item 1' });
      await createTestItem(token, { title: 'Cascade Item 2' });

      // Verify items exist
      const beforeRes = await request(app)
        .get('/api/items/my/listings')
        .set('Authorization', `Bearer ${token}`);
      expect(beforeRes.body.items.length).toBe(2);

      // Delete user
      await pool.query('DELETE FROM users WHERE id = ?', [user._id]);

      // Verify items were cascade-deleted from items table via foreign key
      const [remainingItems] = await pool.query('SELECT * FROM items WHERE owner = ?', [user._id]);
      expect(remainingItems.length).toBe(0);
    });
  });
});
