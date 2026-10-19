import { createApp } from './src/app.js';
import { config } from './src/config.js';
import { migrate } from './src/migrate.js';
import { startListener, stopListener } from './src/events.js';
import { pool, query } from './src/db.js';

await migrate();
const app = createApp();
await startListener();
const server = app.listen(config.port, () => {
  console.log(`[taqvion] ${config.brand} — listening on ${config.baseUrl} (port ${config.port})`);
});

// Housekeeping: expired sessions
setInterval(() => query('delete from sessions where expires_at < now()').catch(() => {}), 6 * 3600_000).unref();

async function shutdown() {
  console.log('[taqvion] shutting down');
  server.close();
  await stopListener();
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
