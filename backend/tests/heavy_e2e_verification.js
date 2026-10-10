// API integration tests
// Tests endpoints against local development server
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000/api';
const UPLOADS_URL = 'http://localhost:5000/uploads';

async function req(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, options);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, body: data };
}

async function runHeavyVerification() {
  console.log('Running API verification tests...\n');
  const results = [];
  let testNum = 0;

  async function test(name, fn) {
    testNum++;
    process.stdout.write(`[Test ${String(testNum).padStart(2, '0')}] ${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
      results.push({ name, pass: true });
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      results.push({ name, pass: false, error: err.message });
    }
  }

  // 1. Health check
  await test('GET /api/health - Server health & uptime', async () => {
    const res = await req('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, 'healthy');
  });

  // 2. CORS allowlist enforcement
  await test('CORS allowlist: accepts localhost:5173, rejects untrusted', async () => {
    const trustedRes = await req('/health', {
      headers: { Origin: 'http://localhost:5173' }
    });
    assert.equal(trustedRes.headers.get('access-control-allow-origin'), 'http://localhost:5173');

    const untrustedRes = await req('/health', {
      headers: { Origin: 'https://malicious-site.com' }
    });
    // Untrusted should NOT have access-control-allow-origin
    assert.equal(untrustedRes.headers.get('access-control-allow-origin'), null);
  });

  // 3. Register user
  const uniqueId = Date.now();
  const testUser = {
    name: `Deep QA User ${uniqueId}`,
    email: `deepqa_${uniqueId}@rehome.test`,
    password: 'password123',
    city: 'Bangalore'
  };
  let userToken = null;
  let userId = null;

  await test('POST /api/auth/register - Create new user account', async () => {
    const res = await req('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, testUser.email);
    userToken = res.body.token;
    userId = res.body.user.id || res.body.user._id;
  });

  // 4. Duplicate registration rejection
  await test('POST /api/auth/register - Reject duplicate email (409 Conflict)', async () => {
    const res = await req('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    assert.ok([400, 409].includes(res.status), `Expected 409 or 400, got ${res.status}`);
    assert.equal(res.body.success, false);
  });

  // 5. Login
  await test('POST /api/auth/login - Login with registered credentials', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password })
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
  });

  // 6. Login with wrong password
  await test('POST /api/auth/login - Reject invalid credentials', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: 'wrongpassword' })
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // 7. Verify /auth/me
  await test('GET /api/auth/me - Authenticated profile fetch', async () => {
    const res = await req('/auth/me', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, testUser.email);
  });

  // 8. Create Free Item Listing (JSON)
  let _freeItemId = null;
  await test('POST /api/items - Create 100% Free Item Listing', async () => {
    const res = await req('/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: `Vintage Oak Bookshelf ${uniqueId}`,
        description: 'Solid wooden bookshelf with 4 shelves in great condition.',
        category: 'Furniture',
        condition: 'Good',
        isFree: true,
        price: 0,
        city: 'Bangalore',
        address: 'Indiranagar 100ft Rd',
        latitude: 12.9716,
        longitude: 77.5946
      })
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.item.isFree, true);
    assert.equal(res.body.item.price, 0);
    _freeItemId = res.body.item._id || res.body.item.id;
  });

  // 9. Enforce free items must have price = 0
  await test('POST /api/items - Enforce price is 0 when isFree=true', async () => {
    const res = await req('/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: `Free Item with non-zero price ${uniqueId}`,
        description: 'Should automatically be forced to 0 price',
        category: 'Books',
        condition: 'Like New',
        isFree: true,
        price: 50,
        city: 'Bangalore'
      })
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.item.price, 0);
  });

  // 10. Create Paid Item Listing with custom image URL
  let paidItemId = null;
  await test('POST /api/items - Create Paid Item Listing with custom image URL', async () => {
    const res = await req('/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: `Deluxe Espresso Machine ${uniqueId}`,
        description: '15-bar pump espresso maker with milk frother.',
        category: 'Appliances',
        condition: 'Like New',
        isFree: false,
        price: 45,
        city: 'Bangalore',
        address: 'Koramangala 5th Block',
        latitude: 12.9352,
        longitude: 77.6245,
        imageUrls: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6'
      })
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.item.price, 45);
    assert.equal(res.body.item.isFree, false);
    paidItemId = res.body.item._id || res.body.item.id;
  });

  // 11. Create Item Listing with Real Multipart File Upload
  let uploadItemId = null;
  let uploadedImageFilename = null;
  await test('POST /api/items (Multipart) - Real file upload via Multer', async () => {
    // Create dummy image buffer
    const boundary = `----WebKitFormBoundary${Date.now()}`;
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes
    const dummyImage = Buffer.concat([pngHeader, Buffer.alloc(100)]);

    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nMultipart Test Lamp ${uniqueId}\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nDesk lamp uploaded via multipart\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nElectronics\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="condition"\r\n\r\nNew\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="isFree"\r\n\r\ntrue\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="city"\r\n\r\nBangalore\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="test-lamp.png"\r\nContent-Type: image/png\r\n\r\n`
    ];

    const bodyBuffer = Buffer.concat([
      Buffer.from(bodyParts.join('')),
      dummyImage,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const res = await req('/items', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${userToken}`
      },
      body: bodyBuffer
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.item.images.length > 0);
    assert.ok(res.body.item.images[0].startsWith('/uploads/'));
    uploadItemId = res.body.item._id || res.body.item.id;
    uploadedImageFilename = res.body.item.images[0].replace('/uploads/', '');
  });

  // 12. Verify static serving of uploaded image
  await test('GET /uploads/:filename - Serve uploaded static image', async () => {
    const res = await req(`${UPLOADS_URL}/${uploadedImageFilename}`);
    assert.equal(res.status, 200);
  });

  // 13. Query items with search keyword
  await test('GET /api/items?q=... - Search filtering by keyword', async () => {
    const res = await req(`/items?q=Espresso`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.some((i) => i.title.includes('Espresso')));
  });

  // 14. Filter items by category
  await test('GET /api/items?category=Furniture - Category filter', async () => {
    const res = await req(`/items?category=Furniture`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length > 0);
    assert.ok(res.body.items.every((i) => i.category === 'Furniture'));
  });

  // 15. Filter items by condition
  await test('GET /api/items?condition=Good - Condition filter', async () => {
    const res = await req(`/items?condition=Good`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.every((i) => i.condition === 'Good'));
  });

  // 16. Filter free only
  await test('GET /api/items?freeOnly=true - Free items filter', async () => {
    const res = await req(`/items?freeOnly=true`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.every((i) => i.isFree === true && i.price === 0));
  });

  // 17. Filter by price range
  await test('GET /api/items?minPrice=1&maxPrice=50 - Price range filter', async () => {
    const res = await req(`/items?minPrice=1&maxPrice=50`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.every((i) => i.price >= 1 && i.price <= 50));
  });

  // 18. Sorting: price ascending and descending
  await test('GET /api/items?sortBy=price_asc - Sort by price ascending', async () => {
    const res = await req(`/items?sortBy=price_asc&limit=10`);
    assert.equal(res.status, 200);
    for (let i = 0; i < res.body.items.length - 1; i++) {
      assert.ok(res.body.items[i].price <= res.body.items[i + 1].price);
    }
  });

  // 19. Retrieve single item by ID
  await test('GET /api/items/:id - Retrieve item with populated owner', async () => {
    const res = await req(`/items/${paidItemId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.item.title, `Deluxe Espresso Machine ${uniqueId}`);
    assert.ok(res.body.item.owner);
    assert.equal(res.body.item.owner.name, testUser.name);
    assert.equal(res.body.item.owner.password, undefined); // sanitized
  });

  // 20. 404 for invalid ID
  await test('GET /api/items/:id - Return 404 for non-existent item ID', async () => {
    const res = await req('/items/non-existent-uuid-12345');
    assert.equal(res.status, 404);
  });

  // 21. Status update: Mark Reserved
  await test('PATCH /api/items/:id/status - Update status to Reserved', async () => {
    const res = await req(`/items/${paidItemId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ status: 'Reserved' })
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.item.status, 'Reserved');
  });

  // 22. Status update: Mark Given Away
  await test('PATCH /api/items/:id/status - Update status to Given Away', async () => {
    const res = await req(`/items/${paidItemId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ status: 'Given Away' })
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.item.status, 'Given Away');
  });

  // 23. Unauthorized status change by another user
  await test('PATCH /api/items/:id/status - Prevent stranger from modifying item status', async () => {
    // Create stranger user
    const strangerRes = await req('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Stranger User',
        email: `stranger_${Date.now()}@rehome.test`,
        password: 'password123',
        city: 'Bangalore'
      })
    });
    const strangerToken = strangerRes.body.token;

    const res = await req(`/items/${paidItemId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${strangerToken}`
      },
      body: JSON.stringify({ status: 'Available' })
    });
    assert.equal(res.status, 403);
  });

  // 24. My listings endpoint
  await test('GET /api/items/my/listings - Retrieve items owned by user', async () => {
    const res = await req('/items/my/listings', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length >= 3);
  });

  // 25. Nearby geospatial search
  await test('GET /api/items/nearby - Geospatial distance calculation via ST_Distance_Sphere', async () => {
    const res = await req('/items/nearby?lat=12.9716&lng=77.5946&radius=15');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
    if (res.body.items.length > 0) {
      assert.ok(res.body.items[0].distanceKm !== undefined);
    }
  });

  // 26. User profile retrieval
  await test('GET /api/users/:id - Public user profile with listing counts', async () => {
    const res = await req(`/users/${userId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, testUser.name);
    assert.ok(res.body.user.totalListingsCount >= 3);
  });

  // 27. User profile update
  await test('PUT /api/users/me - Update user profile information', async () => {
    const res = await req('/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        phone: '+91 9998887776',
        address: 'MG Road, 4th Cross'
      })
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.phone, '+91 9998887776');
  });

  // 28. Delete item and verify file cleanup on disk
  await test('DELETE /api/items/:id - Delete listing and clean uploaded image from disk', async () => {
    const uploadsDir = path.resolve(__dirname, '../uploads');
    const diskFilePath = path.join(uploadsDir, uploadedImageFilename);

    // Verify file exists before deletion
    assert.equal(fs.existsSync(diskFilePath), true);

    const delRes = await req(`/items/${uploadItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);

    // Verify file has been deleted from disk
    assert.equal(fs.existsSync(diskFilePath), false);
  });

  // 29. SQL Injection resistance on search query
  await test('Security: Neutralize SQL injection payload in search param "q"', async () => {
    const payload = "' UNION SELECT 1, 2, 3, 4 --";
    const res = await req(`/items?q=${encodeURIComponent(payload)}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  // 30. SQL Injection resistance on sortBy param
  await test('Security: Neutralize SQL injection payload in "sortBy"', async () => {
    const payload = "price; DROP TABLE users; --";
    const res = await req(`/items?sortBy=${encodeURIComponent(payload)}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  console.log('\n==========================================');
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Summary: ${passed}/${total} passed, ${failed} failed`);
  console.log('==========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHeavyVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
