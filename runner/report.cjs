const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PDFDocument = require('pdfkit');
const { ROOT } = require('./run.cjs');

function createReport(run, tag) {
  if (!/^v\d+\.0\.0$/.test(tag)) throw new Error('Major release tag required: vN.0.0');
  const source = path.join(ROOT, 'data', run.id + '.json');
  const digest = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  const folder = path.join(ROOT, 'artifacts');
  fs.mkdirSync(folder, { recursive: true });
  const target = path.join(folder, 'compliance-' + tag + '-' + run.id.slice(0, 8) + '.pdf');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: {
      Title: 'QA evidence for ' + tag, Author: 'API Quality Control Center',
      Subject: 'Automated test and compliance check summary'
    } });
    const output = fs.createWriteStream(target);
    doc.pipe(output);
    doc.registerFont('Body', path.join(ROOT, 'assets', 'DejaVuSans.ttf'));
    doc.registerFont('Heading', path.join(ROOT, 'assets', 'DejaVuSans-Bold.ttf'));
    doc.font('Heading').fontSize(20).fillColor('#163351').text('API Quality Control Center');
    doc.font('Body').fontSize(11).fillColor('#4a657b').text('Automated release evidence - ' + tag);
    doc.moveDown(1.5).fillColor('#111827').fontSize(9);
    doc.text('Run ID: ' + run.id);
    doc.text('Started (UTC): ' + run.startedAt);
    doc.text('Git commit: ' + run.gitSha);
    doc.text('Outcome: ' + (run.passed ? 'PASS' : 'FAIL'));
    doc.text('Duration: ' + run.durationMs + ' ms');
    doc.text('SHA-256 of saved run JSON: ' + digest, { width: 490 });
    doc.moveDown();
    for (const service of run.services) {
      doc.font('Heading').fontSize(12).fillColor('#163351').text(service.name);
      doc.font('Body').fontSize(9).fillColor('#111827');
      doc.text('Tests: ' + service.tests.testsPassed + ' passed; ' + service.tests.testsFailed + ' failed');
      doc.text('Line coverage: ' + (service.tests.lineCoverage ?? 'unavailable') + '% (gate ' + (service.tests.threshold ?? 85) + '%)');
      doc.text('OpenAPI operations probed: ' + (service.contract.operationsChecked || 0) + '; result ' + (service.contract.passed ? 'PASS' : 'FAIL'));
      doc.text('SonarQube: ' + service.sonar.status + (service.sonar.qualityGate ? '; gate ' + service.sonar.qualityGate : ''));
      if (service.contract.failures?.length) doc.text('Contract failures: ' + service.contract.failures.join('; '), { width: 490 });
      doc.moveDown();
    }
    doc.font('Heading').fontSize(12).fillColor('#163351').text('Security checks');
    doc.font('Body').fontSize(9).fillColor('#111827');
    doc.text('Dependency audit: ' + run.security.status + '; high: ' + (run.security.npmAudit?.high ?? 'n/a') + ', critical: ' + (run.security.npmAudit?.critical ?? 'n/a'));
    doc.text('Static heuristic findings: ' + run.security.findings.length);
    if (run.security.error) doc.text('Audit note: ' + run.security.error, { width: 490 });
    doc.moveDown().fontSize(8).fillColor('#586477').text(
      'Scope: automated unit/integration tests, sampled API contract responses, dependency advisories and limited static patterns. This document is a traceable engineering record, not a regulatory certification or a full OWASP assessment.',
      { width: 490 }
    );
    doc.end();
    output.on('finish', () => resolve(target));
    output.on('error', reject);
  });
}
module.exports = { createReport };
