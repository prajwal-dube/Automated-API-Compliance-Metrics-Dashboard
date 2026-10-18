const fs = require('node:fs');
const path = require('node:path');
const SwaggerParser = require('@apidevtools/swagger-parser');
const Ajv = require('ajv');
const supertest = require('supertest');

async function checkContract(root, service) {
  const raw = fs.readFileSync(path.join(root, service.openapi), 'utf8');
  // These are trusted, checked-in specifications. Disallow remote and local-file refs.
  const YAML = require('yaml');
  const parsed = YAML.parse(raw);
  function refs(value) {
    if (!value || typeof value !== 'object') return;
    if (value.$ref && !value.$ref.startsWith('#/')) throw new Error('External $ref is forbidden');
    Object.values(value).forEach(refs);
  }
  refs(parsed);
  await SwaggerParser.validate(parsed);
  const spec = await SwaggerParser.dereference(parsed);
  const app = require(path.join(root, service.app));
  const request = supertest(app);
  const ajv = new Ajv({ strict: false, validateFormats: false });
  const failures = [];
  let checked = 0;
  for (const [route, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      checked++;
      const sample = operation['x-test-case'];
      if (!sample || !sample.path || !Number.isInteger(sample.expectedStatus)) {
        failures.push(method.toUpperCase() + ' ' + route + ': missing x-test-case');
        continue;
      }
      try {
        let probe = request[method](sample.path);
        if (sample.body !== undefined) probe = probe.send(sample.body);
        const response = await probe;
        const responseSpec = operation.responses?.[String(sample.expectedStatus)];
        const schema = responseSpec?.content?.['application/json']?.schema;
        if (response.status !== sample.expectedStatus) {
          failures.push(method.toUpperCase() + ' ' + route + ': status ' + response.status + ', expected ' + sample.expectedStatus);
        } else if (!schema) {
          failures.push(method.toUpperCase() + ' ' + route + ': no JSON response schema');
        } else {
          const validate = ajv.compile(schema);
          if (!validate(response.body)) failures.push(method.toUpperCase() + ' ' + route + ': ' + ajv.errorsText(validate.errors));
        }
      } catch (error) { failures.push(method.toUpperCase() + ' ' + route + ': ' + error.message); }
    }
  }
  return { passed: checked > 0 && failures.length === 0, operationsChecked: checked, failures };
}
module.exports = { checkContract };
