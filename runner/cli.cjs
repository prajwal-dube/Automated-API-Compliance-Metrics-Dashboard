const { runQa } = require('./run.cjs');
const { createReport } = require('./report.cjs');

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--sequential') ? 'sequential' : 'parallel';
  const release = args.indexOf('--release-tag');
  const tag = release >= 0 ? args[release + 1] : null;
  if (release >= 0 && !/^v\d+\.0\.0$/.test(tag || '')) throw new Error('Use --release-tag vN.0.0');
  const run = await runQa(mode);
  console.log(JSON.stringify(run, null, 2));
  if (tag) console.log('PDF report:', await createReport(run, tag));
  process.exitCode = run.passed ? 0 : 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
