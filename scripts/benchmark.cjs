const { runQa } = require('../runner/run.cjs');
async function main() {
  const sequential = await runQa('sequential');
  const parallel = await runQa('parallel');
  const change = (sequential.durationMs - parallel.durationMs) / sequential.durationMs * 100;
  const report = {
    sequentialId: sequential.id, parallelId: parallel.id,
    sequentialMs: sequential.durationMs, parallelMs: parallel.durationMs,
    cycleTimeReductionPercent: Number(change.toFixed(2)),
    bothPassed: sequential.passed && parallel.passed,
    note: 'One paired local sample; repeat on fixed hardware before claiming an improvement.'
  };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.bothPassed ? 0 : 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
