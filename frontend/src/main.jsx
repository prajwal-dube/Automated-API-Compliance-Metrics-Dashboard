import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState({ running: false });
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  async function refresh() {
    try {
      const [history, state] = await Promise.all([
        fetch(base + '/api/runs').then(r => r.json()),
        fetch(base + '/api/status').then(r => r.json())
      ]);
      setRuns(history); setStatus(state); setError('');
    } catch { setError('API unavailable. Start the QA service to see results.'); }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 4000); return () => clearInterval(timer); }, []);
  const latest = runs.find(row => row.id === selected) || runs[0];
  async function start() {
    try {
      const res = await fetch(base + '/api/runs', { method: 'POST' });
      if (!res.ok) throw new Error('Run could not start');
      setStatus({ running: true }); setError('');
    } catch (e) { setError(e.message); }
  }
  const measured = latest?.checks?.servicesWithCoverageMeasurement ?? 0;
  return <main>
    <aside className="sidebar">
      <div className="brand"><span className="symbol">Q<span>↗</span></span><div>QUALITY<br/><small>CONTROL CENTER</small></div></div>
      <div className="menu-label">WORKSPACE</div><div className="menu active">▦ <span>Overview</span></div>
      <div className="menu">◷ <span>Run history</span></div>
      <div className="side-bottom"><span className="status-dot"/>{status.running ? 'Checks running' : 'Pipeline ready'}<small>Automated quality gates</small></div>
    </aside>
    <section className="content">
      <header><div><div className="eyebrow">ENGINEERING INTELLIGENCE</div><h1>Quality overview</h1><p>One view of tests, API contracts, security signals, and release evidence.</p></div>
        <button className="run-button" disabled={status.running} onClick={start}>{status.running ? 'Running checks…' : '▶ Run QA checks'}</button></header>
      {error && <div className="notice">{error}</div>}
      <div className="summary">
        <article className="metric"><div className="metric-top">LATEST GATE <span>↗</span></div><strong className={latest?.passed ? 'good' : 'bad'}>{latest ? (latest.passed ? 'PASS' : 'FAIL') : '—'}</strong><small>{latest ? new Date(latest.startedAt).toLocaleString() : 'No run yet'}</small></article>
        <article className="metric"><div className="metric-top">SERVICES MEASURED <span>◉</span></div><strong>{measured}<i> / {latest?.checks?.connectedServices ?? 2}</i></strong><small>Coverage data available</small></article>
        <article className="metric"><div className="metric-top">API OPERATIONS <span>⌁</span></div><strong>{latest?.checks?.contractsChecked ?? '—'}</strong><small>Sampled contract probes</small></article>
        <article className="metric"><div className="metric-top">EVALUATION TIME <span>◷</span></div><strong>{latest ? (latest.durationMs / 1000).toFixed(1) : '—'}<i> s</i></strong><small>Run wall-clock duration</small></article>
      </div>
      <div className="split">
        <section className="panel service-panel"><div className="panel-heading"><div><div className="eyebrow">LATEST RUN</div><h2>Connected services</h2></div><span className={'badge ' + (latest?.passed ? 'pass' : 'fail')}>{latest ? (latest.passed ? 'All gates passed' : 'Action required') : 'No data'}</span></div>
          {(latest?.services || []).map(service => <div className="service" key={service.id}>
            <div className="service-title"><b>{service.name}</b><span className={'pill ' + (service.passed ? 'pass' : 'fail')}>{service.passed ? 'PASS' : 'FAIL'}</span></div>
            <div className="service-details"><span>{service.tests.testsPassed ?? 0} tests passed</span><span>{service.contract.operationsChecked ?? 0} API probes</span><span>Sonar: {service.sonar.status}</span></div>
            <div className="coverage-line"><span>Line coverage</span><b>{service.tests.lineCoverage ?? '—'}%</b></div>
            <div className="track"><span style={{ width: (service.tests.lineCoverage || 0) + '%', background: service.tests.lineCoverage >= 85 ? '#8ddd9f' : '#ff967d' }}/><i style={{ left: '85%' }}/></div>
            {!!service.contract.failures?.length && <small className="failure">{service.contract.failures.join('; ')}</small>}
          </div>)}
          {!latest && <div className="empty">Run checks to populate coverage and contract results.</div>}
        </section>
        <section className="panel security-panel"><div className="eyebrow">SECURITY POSTURE</div><h2>Dependency & code checks</h2>
          <div className="security-number">{latest?.security?.findings?.length ?? '—'}</div><p>static heuristic findings</p>
          <div className="separator"/><div className="security-row"><span>Dependency audit</span><b>{latest?.security?.status ?? '—'}</b></div>
          <div className="security-row"><span>High advisories</span><b>{latest?.security?.npmAudit?.high ?? '—'}</b></div>
          <div className="security-row"><span>Critical advisories</span><b>{latest?.security?.npmAudit?.critical ?? '—'}</b></div>
          <div className="hint">The gate blocks high/critical advisories or selected unsafe code patterns. This is a limited scan.</div>
        </section>
      </div>
      <section className="panel history"><div className="panel-heading"><div><div className="eyebrow">ACTIVITY</div><h2>Run history</h2></div><span className="hint">Refreshes every 4 seconds</span></div>
        <div className="table-wrap"><table><thead><tr><th>RUN ID</th><th>STARTED</th><th>MODE</th><th>DURATION</th><th>RESULT</th></tr></thead>
          <tbody>{runs.map(run => <tr key={run.id} onClick={() => setSelected(run.id)} className={run.id === latest?.id ? 'selected' : ''}>
            <td className="mono">{run.id.slice(0, 8)}</td><td>{new Date(run.startedAt).toLocaleString()}</td><td>{run.mode}</td><td>{(run.durationMs / 1000).toFixed(1)} s</td>
            <td><span className={'pill ' + (run.passed ? 'pass' : 'fail')}>{run.passed ? 'PASS' : 'FAIL'}</span></td></tr>)}
            {!runs.length && <tr><td colSpan="5" className="empty">No saved runs yet</td></tr>}</tbody></table></div></section>
      <footer>Demo services only · 85% line coverage gate · SonarQube metrics are optional</footer>
    </section>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
