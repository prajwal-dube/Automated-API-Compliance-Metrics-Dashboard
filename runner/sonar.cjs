async function sonarSnapshot(service) {
  const host = process.env.SONAR_HOST_URL;
  const token = process.env.SONAR_TOKEN;
  if (!host || !token) return { status: 'NOT_CONFIGURED' };
  try {
    const url = new URL('/api/measures/component', host);
    url.searchParams.set('component', service.sonarProjectKey);
    url.searchParams.set('metricKeys', 'bugs,vulnerabilities,code_smells,coverage');
    const gateUrl = new URL('/api/qualitygates/project_status', host);
    gateUrl.searchParams.set('projectKey', service.sonarProjectKey);
    const options = { headers: { Authorization: 'Basic ' + Buffer.from(token + ':').toString('base64') },
      signal: AbortSignal.timeout(10000) };
    const [response, gateResponse] = await Promise.all([fetch(url, options), fetch(gateUrl, options)]);
    if (!response.ok || !gateResponse.ok) throw new Error('SonarQube HTTP ' + response.status + '/' + gateResponse.status);
    const [result, gate] = await Promise.all([response.json(), gateResponse.json()]);
    return { status: 'CONNECTED', measures: result.component?.measures ?? [],
      qualityGate: gate.projectStatus?.status ?? 'UNKNOWN' };
  } catch (error) { return { status: 'ERROR', error: error.message }; }
}
module.exports = { sonarSnapshot };
