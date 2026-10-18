const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const acorn = require('acorn');
const walk = require('acorn-walk');
const execFileAsync = promisify(execFile);

function scanSource(source, filename) {
  const findings = [];
  const ast = acorn.parse(source, { ecmaVersion: 'latest', locations: true, sourceType: 'script' });
  walk.simple(ast, {
    CallExpression(node) {
      if (node.callee.type === 'Identifier' && ['eval', 'Function'].includes(node.callee.name))
        findings.push({ file: filename, line: node.loc.start.line, rule: 'dynamic-code-execution', severity: 'HIGH' });
      if (node.callee.type === 'MemberExpression' && ['exec', 'execSync'].includes(node.callee.property.name))
        findings.push({ file: filename, line: node.loc.start.line, rule: 'possible-shell-execution', severity: 'HIGH' });
    },
    AssignmentExpression(node) {
      if (node.left.type === 'MemberExpression' && node.left.property.name === 'innerHTML')
        findings.push({ file: filename, line: node.loc.start.line, rule: 'unsafe-html-assignment', severity: 'HIGH' });
    }
  });
  return findings;
}

async function checkSecurity(root, services) {
  const findings = [];
  for (const service of services) {
    const file = path.join(root, service.source);
    findings.push(...scanSource(fs.readFileSync(file, 'utf8'), service.source));
  }
  if (process.env.QA_SKIP_AUDIT === '1')
    return { passed: false, status: 'SKIPPED', findings, npmAudit: null,
      error: 'Dependency audit explicitly skipped; gate remains red' };
  try {
    let output;
    try { output = await execFileAsync('npm', ['audit', '--json', '--omit=dev'],
      { cwd: root, timeout: 90000, maxBuffer: 8 * 1024 * 1024 }); }
    catch (error) { output = { stdout: error.stdout, stderr: error.stderr }; }
    const audit = JSON.parse(output.stdout);
    if (!audit.metadata?.vulnerabilities) throw new Error(output.stderr || 'No npm audit metadata');
    const counts = audit.metadata.vulnerabilities;
    return { passed: findings.length === 0 && counts.high === 0 && counts.critical === 0,
      status: 'COMPLETED', findings, npmAudit: counts, error: null };
  } catch (error) {
    return { passed: false, status: 'ERROR', findings, npmAudit: null, error: String(error.message).slice(0, 500) };
  }
}
module.exports = { checkSecurity, scanSource };
