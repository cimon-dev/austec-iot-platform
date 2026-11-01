import { postgresClient } from '../core/database/postgres.client.js';
import { PostgresService } from '../services/postgres.service.js';

async function run() {
  const ok = await postgresClient.connect();
  console.log('Postgres connected:', ok);
  if (ok) {
    const svc = new PostgresService();
    await svc.connect();
    await svc.initTables();
    console.log('initTables executed successfully!');
    const res = await postgresClient.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'chat_%'");
    console.log('Chat tables in DB:', res.rows);
  }
  process.exit(0);
}

run().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
