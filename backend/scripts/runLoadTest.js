import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import FormData from 'form-data';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const RESULTS_FILE = path.resolve(backendDir, 'load_test_results.json');

// Helper to wait for HTTP server to respond
async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {
      // Retry after short sleep
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Server at ${url} failed to start within ${timeoutMs}ms`);
}

// Helper to get system & process memory
function getMemoryInfo() {
  const mem = process.memoryUsage();
  return {
    rssMB: (mem.rss / 1024 / 1024).toFixed(2),
    heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2)
  };
}

async function runAutocannonTest({ title, url, connections, duration }) {
  console.log(`\n======================================================`);
  console.log(`[Load Test] Running: ${title}`);
  console.log(`[Load Test] Target: ${url} | Connections: ${connections} | Duration: ${duration}s`);
  console.log(`======================================================`);

  const memBefore = getMemoryInfo();

  const result = await autocannon({
    url,
    connections,
    duration,
    headers: {
      'User-Agent': 'AutocannonLoadTest/1.0'
    }
  });

  const memAfter = getMemoryInfo();

  const rps = result.requests.average || (result.requests.total / duration);
  const totalRequests = result.requests.total;
  const errors = result.errors + result.timeouts;
  const non2xx = result.non2xx;
  const errorRate = totalRequests > 0 ? (((errors + non2xx) / totalRequests) * 100).toFixed(2) : 0;

  const p50 = result.latency.p50;
  const p95 = result.latency.p97_5 || result.latency.p90; // autocannon provides p50, p75, p90, p97_5, p99
  const p99 = result.latency.p99;

  const passedThreshold = p95 <= 300;

  const metrics = {
    title,
    url,
    connections,
    duration,
    totalRequests,
    rps: Number(rps.toFixed(2)),
    errorRate: Number(errorRate),
    latencyMs: {
      p50,
      p95,
      p99,
      max: result.latency.max,
      min: result.latency.min
    },
    passedThreshold,
    memoryBeforeMB: memBefore,
    memoryAfterMB: memAfter
  };

  console.log(`[Results] Requests: ${totalRequests} | RPS: ${metrics.rps} | Error Rate: ${metrics.errorRate}%`);
  console.log(`[Latency] p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms (Target: p95 <= 300ms: ${passedThreshold ? 'PASSED' : 'FLAGGED'})`);
  console.log(`[Memory] RSS: ${memBefore.rssMB}MB -> ${memAfter.rssMB}MB | Heap: ${memBefore.heapUsedMB}MB -> ${memAfter.heapUsedMB}MB`);

  return metrics;
}

// Upload stress: 50 concurrent 5-image uploads
async function runUploadStressTest(authToken) {
  console.log(`\n======================================================`);
  console.log(`[Upload Stress] 50 concurrent 5-image uploads`);
  console.log(`======================================================`);

  // Create a 10KB 1x1 test JPEG buffer
  const dummyBuffer = Buffer.alloc(10 * 1024, 0xff);

  const totalConcurrent = 50;
  const promises = [];
  const start = Date.now();

  for (let i = 0; i < totalConcurrent; i++) {
    const form = new FormData();
    form.append('title', `Stress Test Item Upload #${i + 1}`);
    form.append('description', 'Stress test item with 5 concurrent image uploads');
    form.append('category', 'Furniture');
    form.append('condition', 'Good');
    form.append('price', '15');
    form.append('city', 'Bangalore');

    for (let f = 0; f < 5; f++) {
      form.append('images', dummyBuffer, {
        filename: `stress_img_${i}_${f}.jpg`,
        contentType: 'image/jpeg'
      });
    }

    const promise = new Promise((resolve) => {
      const reqStart = Date.now();
      const req = http.request(
        `${BASE_URL}/api/items`,
        {
          method: 'POST',
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${authToken}`
          }
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            const duration = Date.now() - reqStart;
            let parsed = null;
            try {
              parsed = JSON.parse(body);
            } catch {}
            resolve({
              statusCode: res.statusCode,
              duration,
              success: res.statusCode === 201 && parsed?.success,
              itemId: parsed?.item?._id || parsed?.item?.id
            });
          });
        }
      );

      req.on('error', (err) => {
        resolve({
          statusCode: 500,
          duration: Date.now() - reqStart,
          success: false,
          error: err.message
        });
      });

      form.pipe(req);
    });

    promises.push(promise);
  }

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - start;
  const successes = results.filter((r) => r.success).length;
  const failures = results.filter((r) => !r.success).length;
  const durations = results.map((r) => r.duration).sort((a, b) => a - b);
  const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[durations.length - 1];

  console.log(`[Upload Stress Completed] Duration: ${totalDuration}ms`);
  console.log(`Successes: ${successes}/${totalConcurrent} | Failures: ${failures}`);
  console.log(`Avg Latency: ${avgDuration}ms | p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms`);

  return {
    test: 'Upload Stress (50 concurrent 5-image uploads)',
    totalConcurrent,
    successes,
    failures,
    totalDurationMs: totalDuration,
    avgLatencyMs: Number(avgDuration),
    p50Ms: p50,
    p95Ms: p95,
    p99Ms: p99,
    passed: successes === totalConcurrent
  };
}

async function main() {
  console.log('[Load Test Orchestrator] Starting test backend server on port', TEST_PORT);

  const serverProcess = spawn('node', ['src/server.js'], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'test',
      MYSQL_DATABASE: 'rehome_test',
      MYSQL_CONNECTION_LIMIT: '100'
    },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('[Load Test Server Process Error]', err);
  });

  try {
    await waitForServer(BASE_URL, 15000);
    console.log('[Load Test Orchestrator] Test server is alive and healthy on', BASE_URL);

    // Fetch sample item ID for detail endpoint
    const listRes = await fetch(`${BASE_URL}/api/items?limit=1`);
    const listData = await listRes.json();
    const sampleItemId = listData.items[0]._id || listData.items[0].id;
    console.log('[Load Test Orchestrator] Using sample item ID for detail endpoint:', sampleItemId);

    // Login as benchmark user to obtain auth token
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'benchmark_user_1@rehome.test',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    const authToken = loginData.token;
    console.log('[Load Test Orchestrator] Authenticated successfully as benchmark_user_1');

    const testRuns = [];

    // Endpoints under test:
    // 1. list: GET /api/items
    // 2. search (q): GET /api/items?q=sofa
    // 3. nearby: GET /api/items/nearby?lat=12.9716&lng=77.5946&radiusKm=15
    // 4. detail: GET /api/items/:id
    const endpoints = [
      { name: 'List Items', path: '/api/items' },
      { name: 'Search Items (q=sofa)', path: '/api/items?q=sofa' },
      { name: 'Nearby Items (lat=12.9716, lng=77.5946, radiusKm=15)', path: '/api/items/nearby?lat=12.9716&lng=77.5946&radiusKm=15' },
      { name: 'Item Detail', path: `/api/items/${sampleItemId}` }
    ];

    const concurrencyLevels = [100, 500, 1000];
    const durationPerTest = parseInt(process.env.BENCH_DURATION, 10) || 30; // 30s as required by prompt

    for (const ep of endpoints) {
      for (const c of concurrencyLevels) {
        const metrics = await runAutocannonTest({
          title: `${ep.name} [${c} Connections, ${durationPerTest}s]`,
          url: `${BASE_URL}${ep.path}`,
          connections: c,
          duration: durationPerTest
        });
        testRuns.push(metrics);
        // Cool-down 3s between high-load tests
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // Run upload stress test
    const uploadMetrics = await runUploadStressTest(authToken);

    const fullReport = {
      timestamp: new Date().toISOString(),
      database: 'rehome_test',
      seedData: '1,000 users, 10,000 items',
      concurrencyTests: testRuns,
      uploadStressTest: uploadMetrics
    };

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(fullReport, null, 2));
    console.log(`\n[Load Test Orchestrator] Results written to ${RESULTS_FILE}`);

  } catch (err) {
    console.error('[Load Test Orchestrator Fatal Error]', err);
  } finally {
    console.log('[Load Test Orchestrator] Terminating test server...');
    serverProcess.kill('SIGTERM');
  }
}

main();
