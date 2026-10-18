// Deliberately set an impossible threshold to demonstrate that the gate turns red.
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { checkTests } = require('../runner/coverage.cjs');
const { scanSource } = require('../runner/security.cjs');
const root = path.resolve(__dirname, '..');
async function main() {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-gate-'));
  const service = require('../services.json')[0];
  const result = await checkTests(root, service, scratch, 101);
  const finding = scanSource('eval(input)', 'example.js');
  console.log(JSON.stringify({ lineCoverage: result.lineCoverage, threshold: 101,
    coverageGateRejected: !result.passed, unsafeCodeDetected: finding.length === 1 }, null, 2));
  if (result.passed || finding.length !== 1) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
