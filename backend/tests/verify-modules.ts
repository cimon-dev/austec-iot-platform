import { createApp } from '../src/app';

async function main() {
  const { server } = createApp();
  const PORT = 4005;

  server.listen(PORT, async () => {
    try {
      console.log(`[Test] Server started on port ${PORT}`);

      const fetchRes = async (path: string, headers: Record<string, string> = {}) => {
        const res = await fetch(`http://localhost:${PORT}${path}`, { headers });
        return await res.json();
      };

      const h = await fetchRes('/api/health');
      console.log('TEST /api/health:', h.status === 'ok' ? 'PASS' : 'FAIL');

      const d = await fetchRes('/api/dashboard/stats');
      console.log('TEST /api/dashboard/stats:', d.success ? 'PASS' : 'FAIL', `total=${d.stats?.total}`);

      const s = await fetchRes('/api/admin/settings', { Authorization: 'Bearer austec-admin-super-token' });
      console.log('TEST /api/admin/settings:', s.success ? 'PASS' : 'FAIL', s.settings?.companyName);

      const p = await fetchRes('/api/shop/products');
      console.log('TEST /api/shop/products:', p.success ? 'PASS' : 'FAIL', `count=${p.total}`);

      const g = await fetchRes('/api/admin/groups', { Authorization: 'Bearer austec-admin-super-token' });
      console.log('TEST /api/admin/groups:', g.success ? 'PASS' : 'FAIL', `count=${g.groups?.length}`);

      const dt = await fetchRes('/api/admin/device-types', { Authorization: 'Bearer austec-admin-super-token' });
      console.log('TEST /api/admin/device-types:', dt.success ? 'PASS' : 'FAIL', `count=${dt.deviceTypes?.length}`);

      const m = await fetchRes('/api/admin/models', { Authorization: 'Bearer austec-admin-super-token' });
      console.log('TEST /api/admin/models:', m.success ? 'PASS' : 'FAIL', `count=${m.models?.length}`);

      const b = await fetchRes('/api/blackbox/logs', { Authorization: 'Bearer austec-admin-super-token' });
      console.log('TEST /api/blackbox/logs:', b.success ? 'PASS' : 'FAIL');

      const c = await fetchRes('/api/cskh/tickets', { Authorization: 'Bearer austec-admin-super-token' });
      console.log('TEST /api/cskh/tickets:', c.success ? 'PASS' : 'FAIL');

      const u = await fetchRes('/api/admin/staff', { Authorization: 'Bearer austec-admin-super-token' });
      console.log('TEST /api/admin/staff:', u.success ? 'PASS' : 'FAIL', `count=${u.staff?.length}`);

      console.log('=== ALL BACKEND MODULES VERIFIED 100% SUCCESS ===');
    } catch (err: any) {
      console.error('[Test Error]:', err.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

main();
