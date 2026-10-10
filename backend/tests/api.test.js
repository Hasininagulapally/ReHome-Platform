import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('ReHome Backend API Integration Tests', () => {
  // Helper to create test user and return token
  const createTestUser = async (override = {}) => {
    const userData = {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      password: 'password123',
      city: 'Bangalore',
      ...override
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send(userData);

    return {
      user: res.body.user,
      token: res.body.token,
      data: userData
    };
  };

  // Helper to create test item
  const createTestItem = async (token, override = {}) => {
    const itemData = {
      title: 'Comfortable 3-Seater Sofa',
      description: 'Gently used fabric sofa in grey color',
      category: 'Furniture',
      condition: 'Like New',
      price: 0,
      isFree: true,
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

  /* ---------------------------------------------------------------
   * 1. Health Check
   * --------------------------------------------------------------- */
  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('healthy');
    });
  });

  /* ---------------------------------------------------------------
   * 2. Authentication APIs
   * --------------------------------------------------------------- */
  describe('Authentication APIs', () => {
    it('POST /api/auth/register - should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Rahul Mehta',
          email: 'rahul@example.com',
          password: 'securePassword123',
          phone: '+91 9876543210',
          city: 'Indiranagar'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('Rahul Mehta');
      expect(res.body.user.email).toBe('rahul@example.com');
      expect(res.body.user.password).toBeUndefined(); // Never expose password hash
    });

    it('POST /api/auth/register - should reject duplicate email registrations', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'duplicate@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('POST /api/auth/register - should reject invalid registration input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '',
          email: 'not-an-email',
          password: '123' // too short
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login - should log in with correct credentials', async () => {
      await createTestUser({ email: 'loginuser@example.com', password: 'mySecretPassword' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'mySecretPassword'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('loginuser@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('POST /api/auth/login - should reject incorrect password', async () => {
      await createTestUser({ email: 'loginwrong@example.com', password: 'correctPassword' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginwrong@example.com',
          password: 'WRONGPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('POST /api/auth/login - should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'ghost@example.com',
          password: 'somePassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/auth/me - should return authenticated user profile with valid token', async () => {
      const { token, user } = await createTestUser({ email: 'me@example.com' });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user._id).toBe(user._id);
      expect(res.body.user.password).toBeUndefined();
    });

    it('GET /api/auth/me - should reject access without a token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no bearer token provided/i);
    });

    it('GET /api/auth/me - should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_garbage_token_123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  /* ---------------------------------------------------------------
   * 3. Item Management APIs
   * --------------------------------------------------------------- */
  describe('Item Management APIs', () => {
    it('POST /api/items - should require authentication', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({
          title: 'Unauthenticated Sofa',
          description: 'test',
          category: 'Furniture',
          condition: 'Good'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/items - should create a free item listing and set owner', async () => {
      const { token, user } = await createTestUser({ email: 'itemowner@example.com' });

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Solid Teak Study Table',
          description: 'Sturdy wooden desk with drawers in excellent condition',
          category: 'Furniture',
          condition: 'Like New',
          price: 0,
          isFree: true,
          city: 'Indiranagar',
          latitude: 12.9716,
          longitude: 77.5946
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.item.title).toBe('Solid Teak Study Table');
      expect(res.body.item.category).toBe('Furniture');
      expect(res.body.item.isFree).toBe(true);
      expect(res.body.item.price).toBe(0);
      expect(res.body.item.status).toBe('Available');
      expect(res.body.item.owner._id).toBe(user._id);
      expect(res.body.item.location.coordinates).toEqual([77.5946, 12.9716]); // GeoJSON lng, lat
    });

    it('POST /api/items - should enforce that free items have price 0', async () => {
      const { token } = await createTestUser({ email: 'freecheck@example.com' });

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Bookshelf Giveaway',
          description: 'Giving away free bookshelf',
          category: 'Furniture',
          condition: 'Good',
          price: 50, // Should be auto-corrected or free items price set to 0
          isFree: true
        });

      expect(res.status).toBe(201);
      expect(res.body.item.isFree).toBe(true);
      expect(res.body.item.price).toBe(0);
    });

    it('POST /api/items - should validate required fields and category enum', async () => {
      const { token } = await createTestUser({ email: 'valcheck@example.com' });

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '', // Missing title
          description: '',
          category: 'Cars', // Invalid category
          condition: 'Broken' // Invalid condition
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/items - should retrieve available items with pagination', async () => {
      const { token } = await createTestUser({ email: 'fetcher@example.com' });
      await createTestItem(token, { title: 'Item 1' });
      await createTestItem(token, { title: 'Item 2' });

      const res = await request(app).get('/api/items?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(2);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      expect(res.body.page).toBe(1);
    });

    it('GET /api/items - should filter by category, search query and free status', async () => {
      const { token } = await createTestUser({ email: 'filteruser@example.com' });
      await createTestItem(token, {
        title: 'Modern Coffee Table',
        category: 'Furniture',
        isFree: true
      });
      await createTestItem(token, {
        title: 'Double Door Refrigerator',
        category: 'Appliances',
        price: 80,
        isFree: false
      });
      await createTestItem(token, {
        title: 'Clean Code Textbook',
        category: 'Books',
        isFree: true
      });

      // Filter by category
      const catRes = await request(app).get('/api/items?category=Appliances');
      expect(catRes.status).toBe(200);
      expect(catRes.body.items.every((i) => i.category === 'Appliances')).toBe(true);

      // Search keyword 'Coffee'
      const searchRes = await request(app).get('/api/items?q=Coffee');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.items.some((i) => i.title.includes('Coffee'))).toBe(true);

      // Free items only
      const freeRes = await request(app).get('/api/items?freeOnly=true');
      expect(freeRes.status).toBe(200);
      expect(freeRes.body.items.every((i) => i.isFree === true)).toBe(true);
    });

    it('GET /api/items/:id - should return single item with owner info', async () => {
      const { token } = await createTestUser({ email: 'singleitem@example.com' });
      const { item } = await createTestItem(token, { title: 'Ergonomic Office Chair' });

      const res = await request(app).get(`/api/items/${item._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item.title).toBe('Ergonomic Office Chair');
      expect(res.body.item.owner.name).toBeDefined();
      expect(res.body.item.owner.password).toBeUndefined();
    });

    it('GET /api/items/:id - should return 404 for non-existent item ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app).get(`/api/items/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('PUT /api/items/:id - should allow the item owner to update the listing', async () => {
      const { token } = await createTestUser({ email: 'updater@example.com' });
      const { item } = await createTestItem(token, { title: 'Original Sofa' });

      const res = await request(app)
        .put(`/api/items/${item._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Modern Sofa (Fabric)',
          condition: 'Good'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item.title).toBe('Updated Modern Sofa (Fabric)');
      expect(res.body.item.condition).toBe('Good');
    });

    it('PUT /api/items/:id - should PREVENT a user from editing another users listing', async () => {
      const owner = await createTestUser({ email: 'realowner@example.com' });
      const stranger = await createTestUser({ email: 'stranger@example.com' });

      const { item } = await createTestItem(owner.token, { title: 'Owners Cherished Desk' });

      // Stranger tries to update the owner's item
      const res = await request(app)
        .put(`/api/items/${item._id}`)
        .set('Authorization', `Bearer ${stranger.token}`)
        .send({
          title: 'Hacked Desk Title'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('DELETE /api/items/:id - should PREVENT a stranger from deleting another users listing', async () => {
      const owner = await createTestUser({ email: 'deleteowner@example.com' });
      const stranger = await createTestUser({ email: 'deletestranger@example.com' });

      const { item } = await createTestItem(owner.token, { title: 'Washing Machine' });

      // Stranger tries to delete
      const res = await request(app)
        .delete(`/api/items/${item._id}`)
        .set('Authorization', `Bearer ${stranger.token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('DELETE /api/items/:id - should allow owner to delete listing', async () => {
      const owner = await createTestUser({ email: 'legitdelete@example.com' });
      const { item } = await createTestItem(owner.token, { title: 'Old Microwave' });

      const res = await request(app)
        .delete(`/api/items/${item._id}`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's gone
      const verifyRes = await request(app).get(`/api/items/${item._id}`);
      expect(verifyRes.status).toBe(404);
    });

    it('PATCH /api/items/:id/status - should update status to Reserved and Given Away', async () => {
      const owner = await createTestUser({ email: 'statusowner@example.com' });
      const { item } = await createTestItem(owner.token, { title: 'Blender' });

      // Mark as Reserved
      const resReserved = await request(app)
        .patch(`/api/items/${item._id}/status`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ status: 'Reserved' });

      expect(resReserved.status).toBe(200);
      expect(resReserved.body.item.status).toBe('Reserved');

      // Mark as Given Away
      const resGiven = await request(app)
        .patch(`/api/items/${item._id}/status`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ status: 'Given Away' });

      expect(resGiven.status).toBe(200);
      expect(resGiven.body.item.status).toBe('Given Away');
    });

    it('GET /api/items/my/listings - should return listings owned by the logged-in user', async () => {
      const userA = await createTestUser({ email: 'userA@example.com' });
      const userB = await createTestUser({ email: 'userB@example.com' });

      await createTestItem(userA.token, { title: 'Item A1' });
      await createTestItem(userA.token, { title: 'Item A2' });
      await createTestItem(userB.token, { title: 'Item B1' });

      const resA = await request(app)
        .get('/api/items/my/listings')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(resA.status).toBe(200);
      expect(resA.body.items.length).toBe(2);
      expect(resA.body.items.every((i) => i.owner.toString() === userA.user._id)).toBe(true);
    });
  });

  /* ---------------------------------------------------------------
   * 4. Nearby Geospatial Search APIs
   * --------------------------------------------------------------- */
  describe('GET /api/items/nearby', () => {
    it('should return 400 if neither coordinates nor city are provided', async () => {
      const res = await request(app).get('/api/items/nearby');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/provide coordinates.*or.*city/i);
    });

    it('should validate coordinate ranges (-90 to 90, -180 to 180)', async () => {
      const res = await request(app).get('/api/items/nearby?latitude=150&longitude=77.59');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid coordinates/i);
    });

    it('should discover nearby items and calculate distance in km using 2dsphere index', async () => {
      const { token } = await createTestUser({ email: 'geouser@example.com' });

      // Indiranagar, Bangalore: 12.9784, 77.6408
      await createTestItem(token, {
        title: 'Indiranagar Sofa',
        latitude: 12.9784,
        longitude: 77.6408,
        city: 'Bangalore'
      });

      // Search near Koramangala (approx 4.5km away: 12.9352, 77.6245)
      const res = await request(app).get(
        '/api/items/nearby?latitude=12.9352&longitude=77.6245&radiusKm=10'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mode).toBe('coordinates');
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);

      const foundItem = res.body.items.find((i) => i.title === 'Indiranagar Sofa');
      expect(foundItem).toBeDefined();
      expect(foundItem.distanceKm).toBeDefined();
      expect(foundItem.distanceKm).toBeGreaterThan(0);
      expect(foundItem.distanceKm).toBeLessThan(10);
    });

    it('should fallback to city search without fake distance when coordinates are not provided', async () => {
      const { token } = await createTestUser({ email: 'cityuser@example.com' });
      await createTestItem(token, {
        title: 'City Specific Dining Table',
        city: 'Mysore'
      });

      const res = await request(app).get('/api/items/nearby?city=Mysore');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mode).toBe('city');
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0].distanceKm).toBeUndefined(); // Does not fake distance
    });
  });

  /* ---------------------------------------------------------------
   * 5. User Profile APIs
   * --------------------------------------------------------------- */
  describe('User Profile APIs', () => {
    it('GET /api/users/:id - should return safe public profile', async () => {
      const { user } = await createTestUser({
        name: 'Public Profile User',
        city: 'Bangalore'
      });

      const res = await request(app).get(`/api/users/${user._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Public Profile User');
      expect(res.body.user.city).toBe('Bangalore');
      expect(res.body.user.password).toBeUndefined();
    });

    it('PUT /api/users/me - should update profile and reject unauthorized role changes', async () => {
      const { token } = await createTestUser({ email: 'updateprofile@example.com' });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Priya S. Rao',
          phone: '+91 9988776655',
          city: 'Whitefield',
          role: 'admin' // Attempting to elevate role
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Priya S. Rao');
      expect(res.body.user.phone).toBe('+91 9988776655');
      expect(res.body.user.role).toBe('user'); // Must remain 'user'
    });
  });

  /* ---------------------------------------------------------------
   * 6. CORS Allowlist Behavior
   * --------------------------------------------------------------- */
  describe('CORS Configuration', () => {
    it('GET /api/health - should allow whitelisted development origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('GET /api/health - should NOT reflect arbitrary untrusted origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil.example.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('OPTIONS preflight - should permit allowed methods for trusted origin', async () => {
      const res = await request(app)
        .options('/api/items')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBeLessThan(400);
      expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
    });

    it('OPTIONS preflight - should reject untrusted cross-site origins', async () => {
      const res = await request(app)
        .options('/api/items')
        .set('Origin', 'https://malicious.attacker.io')
        .set('Access-Control-Request-Method', 'DELETE');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  /* ---------------------------------------------------------------
   * 6. Multer Image Upload & Static Serving
   * --------------------------------------------------------------- */
  describe('Multer File Upload and Static Assets', () => {
    it('POST /api/items - should accept multipart image upload and serve image statically', async () => {
      const { token } = await createTestUser({ email: 'uploaduser@example.com' });

      // Create a small 1x1 test PNG buffer
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Front Load Washing Machine')
        .field('description', '7kg automatic machine with heater')
        .field('category', 'Appliances')
        .field('condition', 'Gently Used')
        .field('price', '120')
        .field('isFree', 'false')
        .attach('images', testImageBuffer, { filename: 'washer.png', contentType: 'image/png' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.item.images.length).toBe(1);
      expect(res.body.item.images[0]).toMatch(/^\/uploads\/item-/);

      // Verify that Express statically serves this uploaded image
      const imagePath = res.body.item.images[0];
      const staticRes = await request(app).get(imagePath);
      expect(staticRes.status).toBe(200);
      expect(staticRes.headers['content-type']).toMatch(/image/);
    });

    it('POST /api/items - should reject invalid executable file upload', async () => {
      const { token } = await createTestUser({ email: 'badupload@example.com' });

      const fakeExeBuffer = Buffer.from('MZ...fake executable content...');

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Malicious Listing')
        .field('description', 'Attempting executable upload')
        .field('category', 'Electronics')
        .field('condition', 'Good')
        .attach('images', fakeExeBuffer, 'virus.exe');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid file type/i);
    });
  });
});
