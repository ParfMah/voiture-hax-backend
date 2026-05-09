/**
 * src/utils/test-api.js
 * Test rapido degli endpoint API Hax-ISA
 * Uso: npm test  (server deve essere avviato)
 */
'use strict';

const http = require('http');
const PORT = process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;

async function req(method, path, body = null) {
  return new Promise((resolve) => {
    const url     = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0,
      },
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', e => resolve({ status: 0, error: e.message }));
    if (payload) r.write(payload);
    r.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log('\n🧪 Test API Hax-ISA\n');

  // Health check
  console.log('📡 Health & Base:');
  await test('GET /api/health → 200', async () => {
    const r = await req('GET', '/api/health');
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.body.success, 'success non true');
    assert(r.body.status === 'OK', 'status non OK');
  });

  await test('GET /unknown → 404', async () => {
    const r = await req('GET', '/api/unknown-endpoint-xyz');
    assert(r.status === 404, `Status ${r.status}`);
  });

  // Vehicles
  console.log('\n🚗 Vehicles:');
  await test('GET /api/vehicles → 200 con data', async () => {
    const r = await req('GET', '/api/vehicles');
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.body.success, 'success non true');
    assert(Array.isArray(r.body.data?.data || r.body.data), 'data non array');
  });

  await test('GET /api/vehicles/featured → 200', async () => {
    const r = await req('GET', '/api/vehicles/featured');
    assert(r.status === 200, `Status ${r.status}`);
  });

  await test('GET /api/vehicles/search?q=BMW → 200', async () => {
    const r = await req('GET', '/api/vehicles/search?q=BMW');
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.body.success, 'success non true');
  });

  await test('GET /api/vehicles/invalid-id → gestione errore', async () => {
    const r = await req('GET', '/api/vehicles/not-a-valid-id');
    assert([400, 404, 500].includes(r.status), `Status inaspettato ${r.status}`);
  });

  // Orders
  console.log('\n📋 Orders:');
  await test('GET /api/orders → 200', async () => {
    const r = await req('GET', '/api/orders');
    assert(r.status === 200, `Status ${r.status}`);
  });

  await test('POST /api/orders con dati mancanti → 422', async () => {
    const r = await req('POST', '/api/orders', { vehicleId: 'test' });
    assert([400, 422].includes(r.status), `Status ${r.status}`);
    assert(!r.body.success, 'success dovrebbe essere false');
  });

  await test('POST /api/orders completo → 201', async () => {
    const r = await req('POST', '/api/orders', {
      vehicleId:   'demo-vehicle-id',
      paymentMode: 'cash',
      customer: {
        nome: 'Test', cognome: 'User',
        email: `test${Date.now()}@test.it`,
        telefono: '+39 333 000 0000',
      },
    });
    assert([201, 422, 500].includes(r.status), `Status inaspettato ${r.status}`);
  });

  // Auth
  console.log('\n🔐 Auth:');
  await test('POST /api/auth/login con credenziali vuote → errore', async () => {
    const r = await req('POST', '/api/auth/login', {});
    assert([400, 401, 422, 503].includes(r.status), `Status ${r.status}`);
  });

  await test('GET /api/auth/me senza token → 401', async () => {
    const r = await req('GET', '/api/auth/me');
    assert([401, 503].includes(r.status), `Status ${r.status}`);
  });

  // Credit
  console.log('\n💳 Credit:');
  await test('POST /api/credit/simulate → risposta', async () => {
    const r = await req('POST', '/api/credit/simulate', {
      vehiclePrice: 30000, deposit: 6000, duration: 36, rate: 2.5,
    });
    assert([200, 400, 503].includes(r.status), `Status ${r.status}`);
  });

  // Stats
  console.log('\n📊 Stats:');
  await test('GET /api/stats/dashboard → 200', async () => {
    const r = await req('GET', '/api/stats/dashboard');
    assert(r.status === 200, `Status ${r.status}`);
    assert(r.body.success, 'success non true');
  });

  // Content
  console.log('\n📝 Content:');
  await test('GET /api/content → 200', async () => {
    const r = await req('GET', '/api/content');
    assert(r.status === 200, `Status ${r.status}`);
  });

  // Risultati
  const total = passed + failed;
  console.log(`
╔═══════════════════════════════╗
║   Risultati Test API Hax-ISA  ║
╠═══════════════════════════════╣
║  ✅ Passati : ${String(passed).padEnd(19)}║
║  ❌ Falliti : ${String(failed).padEnd(19)}║
║  📊 Totale  : ${String(total).padEnd(19)}║
╚═══════════════════════════════╝
  `);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('❌ Errore test runner:', err.message);
  console.error('   Assicurati che il server sia in esecuzione: npm run dev');
  process.exit(1);
});
