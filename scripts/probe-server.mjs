import { spawn } from 'child_process';
import http from 'http';

const server = spawn('npx.cmd', ['next', 'start', '-p', '3005'], { shell: true, stdio: 'pipe' });

server.stdout.on('data', (d) => process.stdout.write(d.toString()));
server.stderr.on('data', (d) => process.stderr.write(d.toString()));

function check(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Probing Next.js production server on port 3005...');
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const home = await check('http://localhost:3005');
      const dash = await check('http://localhost:3005/dashboard');
      console.log('\n=== BROWSER SERVER VERIFICATION RESULTS ===');
      console.log('HOMEPAGE_STATUS:', home.status);
      console.log('HOMEPAGE_HAS_HEADLINE:', home.data.includes('Breathe Better'));
      console.log('HOMEPAGE_HAS_HERO_SVG:', home.data.includes('svg'));
      console.log('DASHBOARD_STATUS:', dash.status);
      console.log('DASHBOARD_HAS_RADAR:', dash.data.includes('Air Quality &amp; Household Defense Radar') || dash.data.includes('Air Quality & Household Defense Radar'));
      console.log('DASHBOARD_HAS_FIXTURE_LABEL:', home.data.includes('Winter Inversion Advisory') || dash.data.includes('SAMPLE FIXTURE'));
      console.log('=== END VERIFICATION ===\n');

      server.kill('SIGINT');
      process.exit(0);
    } catch (e) {
      // waiting for server
    }
  }
  console.error('Probe timed out waiting for server on port 3005');
  server.kill('SIGINT');
  process.exit(1);
}

run();
