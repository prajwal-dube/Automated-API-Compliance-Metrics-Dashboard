const { meetsCoverage } = require('../runner/coverage.cjs');
test('85% line gate blocks below threshold', () => {
  expect(meetsCoverage(84.99, 85)).toBe(false);
  expect(meetsCoverage(85, 85)).toBe(true);
  expect(meetsCoverage(null, 85)).toBe(false);
});
