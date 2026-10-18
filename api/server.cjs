const express = require('express');
const cors = require('cors');
const { runQa, history, readRun } = require('../runner/run.cjs');
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.DASHBOARD_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '16kb' }));
let running = false;
let lastError = null;
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/status', (_req, res) => res.json({ running, lastError }));
app.get('/api/runs', (_req, res) => res.json(history()));
app.get('/api/runs/:id', (req, res) => {
  const result = readRun(req.params.id);
  return result ? res.json(result) : res.status(404).json({ error: 'Run not found' });
});
app.post('/api/runs', (_req, res) => {
  if (running) return res.status(409).json({ error: 'A run is already in progress' });
  running = true; lastError = null;
  setImmediate(async () => {
    try { await runQa('parallel'); }
    catch (error) { lastError = error.message; console.error(error); }
    finally { running = false; }
  });
  return res.status(202).json({ status: 'STARTED' });
});
if (require.main === module) app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('QA API ready'));
module.exports = app;
