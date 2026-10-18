const { scanSource } = require('../runner/security.cjs');

test('flags direct dynamic evaluation in connected source', () => {
  expect(scanSource('eval(userInput)', 'fixture.js')[0].rule).toBe('dynamic-code-execution');
});
test('clean source has no heuristic findings', () => {
  expect(scanSource('const total = 1 + 2;', 'fixture.js')).toEqual([]);
});
