const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { checkTests } = require('./coverage.cjs');
const { checkContract } = require('./contract.cjs');
const { checkSecurity } = require('./security.cjs');
const { sonarSnapshot } = require('./sonar.cjs');

const ROOT = path.resolve(__dirname, '..');
const SERVICES = Object.freeze(require('../services.json'));
const DATA = path.join(ROOT, 'data');
fs.mkdirSync(DATA, { recursive: true });

async function inspectService(service, scratch) {
  const [test, contract, sonar] = await Promise.all([
    checkTests(ROOT, service, scratch).catch(e => ({ passed: false, error: e.message })),
    checkContract(ROOT, service).catch(e => ({ passed: false, operationsChecked: 0, failures: [e.message] })),
    sonarSnapshot(service)
  ]);
  return { id: service.id, name: service.name, tests: test, contract, sonar,
    passed: Boolean(test.passed && contract.passed &&
      (sonar.status === 'NOT_CONFIGURED' || (sonar.status === 'CONNECTED' && sonar.qualityGate === 'OK'))) };
}

async function runQa(mode = 'parallel') {
  if (!['parallel', 'sequential'].includes(mode)) throw new Error('Unknown run mode');
  const id = randomUUID();
  const scratch = path.join(DATA, 'tmp', id);
  const begun = performance.now();
  const startedAt = new Date().toISOString();
  const securityPromise = checkSecurity(ROOT, SERVICES);
  let services;
  if (mode === 'sequential') {
    services = [];
    for (const service of SERVICES) services.push(await inspectService(service, scratch));
  } else {
    services = await Promise.all(SERVICES.map(service => inspectService(service, scratch)));
  }
  const security = await securityPromise;
  const record = {
    id, startedAt, completedAt: new Date().toISOString(),
    gitSha: process.env.GITHUB_SHA || 'local',
    mode, durationMs: Math.round(performance.now() - begun),
    services, security,
    passed: services.every(service => service.passed) && security.passed,
    checks: {
      connectedServices: SERVICES.length,
      servicesWithCoverageMeasurement: services.filter(service => service.tests.lineCoverage !== null && service.tests.lineCoverage !== undefined).length,
      contractsChecked: services.reduce((sum, service) => sum + (service.contract.operationsChecked || 0), 0)
    }
  };
  const file = path.join(DATA, id + '.json');
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(record, null, 2) + '\n');
  fs.renameSync(temp, file);
  return record;
}

function history(limit = 30) {
  return fs.readdirSync(DATA).filter(name => /^[0-9a-f-]{36}\.json$/.test(name))
    .map(name => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
}
function readRun(id) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const file = path.join(DATA, id + '.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}
module.exports = { runQa, history, readRun, ROOT };
