import { recordApiCall } from './src/telemetry.js';
import { GuardBrasil } from './src/guard.js';

async function run() {
  const guard = GuardBrasil.create({});
  const result = guard.inspect("Test CPF 123.456.789-09 under investigation.", { sessionId: 'manual-test-01' });
  await recordApiCall(result, { tenant_id: 'test_tenant', session_id: 'manual-test-01', duration_ms: 42 });
  
  const { getRecentEvents } = await import('./src/telemetry.js');
  // wait a bit for fire-and-forget
  await new Promise(r => setTimeout(r, 1000));
  const events = await getRecentEvents(5);
  console.log('Events found:', events.length);
}
run();
