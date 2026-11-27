/**
 * AirWise live server smoke test.
 * Usage: node tests/e2e/smoke.mjs [baseUrl]
 * Default baseUrl: http://localhost:3000
 */
import assert from 'node:assert/strict';

const BASE_URL = process.argv[2] || 'http://localhost:3000';

async function run() {
  // 1. SSR Home page loads cleanly
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.equal(homeRes.status, 200, 'Home page should return 200');
  const html = await homeRes.text();
  assert.ok(html.includes('AirWise'), 'Home page HTML should include AirWise');

  // 2. Health endpoint returns 200 with model info and security headers
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.equal(healthRes.status, 200, '/api/health should return 200');
  assert.equal(healthRes.headers.get('cache-control'), 'no-store');
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');
  assert.ok(String(health.model).startsWith('gemini-'));

  // 3. CSRF Content-Type guard blocks non-JSON POST with 415
  const formRes = await fetch(`${BASE_URL}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'hello',
  });
  assert.equal(formRes.status, 415, 'Non-JSON POST must return 415');

  // 4. Invalid query params return 400
  const badAqiRes = await fetch(`${BASE_URL}/api/aqi?lat=999&lon=0`);
  assert.equal(badAqiRes.status, 400, 'Out-of-range coordinates must return 400');

  console.log(`AirWise smoke checks passed against ${BASE_URL}`);
}

run().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
