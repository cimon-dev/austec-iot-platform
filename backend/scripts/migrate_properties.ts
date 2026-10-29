import 'dotenv/config';
import { postgresClient } from '../src/core/database/postgres.client.js';

async function run() {
  await postgresClient.connect();
  console.log('Connected to DB');
  await postgresClient.query("ALTER TABLE device_types ADD COLUMN IF NOT EXISTS default_properties JSONB DEFAULT '[]'::jsonb;");
  await postgresClient.query("ALTER TABLE device_models ADD COLUMN IF NOT EXISTS properties_config JSONB DEFAULT '[]'::jsonb;");
  console.log('ALTER TABLE SUCCESSFUL');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
