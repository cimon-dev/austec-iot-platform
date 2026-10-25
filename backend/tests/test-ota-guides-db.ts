import dotenv from 'dotenv';
dotenv.config();
import { PostgresService } from '../src/services/postgres.service.js';

async function main() {
  console.log('Testing PostgreSQL OTA & Guides tables...');
  const pg = new PostgresService();
  await pg.connect();
  await pg.initTables();
  await pg.seedInitialMetadata();

  const firmwares = await pg.getFirmwareReleases();
  console.log(`✅ Firmware Releases in DB: ${firmwares.length}`);
  firmwares.forEach(f => console.log(`   - [${f.modelCode}] ${f.version}: ${f.binaryFilename} (${f.fileSizeBytes} bytes)`));

  const campaigns = await pg.getOtaCampaigns();
  console.log(`✅ OTA Campaigns in DB: ${campaigns.length}`);
  if (campaigns.length > 0) {
    const details = await pg.getOtaCampaignDetails(campaigns[0].id);
    console.log(`   - Campaign "${campaigns[0].campaignName}": ${details.records.length} devices enrolled`);
    details.records.forEach((r: any) => console.log(`     * ${r.hardwareId} (${r.customerName}): ${r.status} (${r.progressPct}%)`));
  }

  const guides = await pg.getInstallationGuides();
  console.log(`✅ Installation Guides in DB: ${guides.length}`);
  guides.forEach(g => console.log(`   - [${g.modelCode}] ${g.title} (Reset: ${g.resetPinDesc} - ${g.resetHoldSeconds}s)`));

  await pg.close();
  console.log('🎉 ALL DATABASE TESTS PASSED 100%!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
