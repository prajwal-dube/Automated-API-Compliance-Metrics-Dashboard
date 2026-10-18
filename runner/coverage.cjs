const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);
const meetsCoverage = (lines, threshold) => typeof lines === 'number' && lines >= threshold;

async function checkTests(root, service, scratch, threshold = 85) {
  const destination = path.join(scratch, service.id);
  fs.mkdirSync(destination, { recursive: true });
  const results = path.join(destination, 'jest-results.json');
  const bin = require.resolve('jest/bin/jest');
  const args = [bin, '--runInBand', '--coverage', '--coverageReporters=json-summary',
    '--coverageDirectory=' + destination, '--collectCoverageFrom=' + service.source,
    '--json', '--outputFile=' + results, '--runTestsByPath', service.test];
  let errorText = '';
  try { await execFileAsync(process.execPath, args, { cwd: root, timeout: 120000, maxBuffer: 4 * 1024 * 1024 }); }
  catch (error) { errorText = (error.stderr || error.message).slice(-1200); }
  const test = fs.existsSync(results) ? JSON.parse(fs.readFileSync(results, 'utf8')) : null;
  const summaryFile = path.join(destination, 'coverage-summary.json');
  const summary = fs.existsSync(summaryFile) ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')).total : null;
  const lines = summary?.lines?.pct ?? null;
  const passed = Boolean(test?.success && meetsCoverage(lines, threshold));
  return { passed, testsPassed: test?.numPassedTests ?? 0, testsFailed: test?.numFailedTests ?? 0,
    lineCoverage: lines, threshold, error: errorText || null };
}
module.exports = { checkTests, meetsCoverage };
