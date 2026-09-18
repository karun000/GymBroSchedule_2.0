const { validatePayload, buildRequest, parseSummary, fingerprint, verifiedFacts } = require('../functions/summary');
const payload = {
  goal: 'cut', latestWeight: { value: 78, unit: 'kg', dateLabel: 'Sep 18' },
  previousWeight: { value: 79, unit: 'kg', dateLabel: 'Sep 11' },
  weightChange: -1, weightTrend: 'down', weightHistory: [],
  prProgress: { exerciseName: 'Bench press', startValue: 60, currentValue: 65, changeValue: 5, unit: 'kg', periodLabel: 'Sep 1 – Sep 18' },
};
test('validates and strips unrelated fields from client data', () => {
  expect(validatePayload({ ...payload, apiKey: 'do-not-forward' })).toEqual(payload);
  expect(() => validatePayload({ ...payload, goal: 'unknown' })).toThrow();
  expect(() => validatePayload({ ...payload, weightHistory: Array(8).fill(payload.latestWeight) })).toThrow();
  expect(() => validatePayload({ ...payload, weightChange: Infinity })).toThrow();
});
test('cache invalidates when goal or historical values change', () => {
  expect(fingerprint(payload)).not.toBe(fingerprint({ ...payload, goal: 'bulk' }));
  expect(fingerprint(payload)).not.toBe(fingerprint({ ...payload, prProgress: { ...payload.prProgress, startValue: 55 } }));
});
test('only accepts complete three-insight summaries', () => {
  expect(() => parseSummary('not json')).toThrow();
  expect(() => parseSummary(JSON.stringify({ progressSummary: 'Hi', insights: ['Only one'] }))).toThrow();
  expect(() => parseSummary(JSON.stringify({ progressSummary: '<placeholder>', insights: ['A', 'B', 'C'] }))).toThrow();
  expect(parseSummary(JSON.stringify({ progressSummary: 'Weight decreased.', insights: ['Weight is 78 kg.', 'Previous weight was 79 kg.', 'Bench press increased.'] })).provider).toBe('nvidia');
});
test('accepts the structured performance and recommendation response', () => {
  const parsed = parseSummary(JSON.stringify({
    progressSummary: 'Weight is trending down toward the selected goal.',
    performance: ['Weight direction aligns with the goal.', 'Bench press increased.'],
    recommendations: ['Keep logging comparable weigh-ins.', 'Record the same rep target for the lift.'],
  }));
  expect(parsed.performance).toHaveLength(2);
  expect(parsed.recommendations).toHaveLength(2);
  expect(parsed.insights).toHaveLength(4);
  expect(parsed.schemaVersion).toBe(2);
});
test('normalizes NVIDIA string sections into two renderable bullets', () => {
  const parsed = parseSummary(JSON.stringify({
    progressSummary: 'Weight is trending down.',
    performance: 'Weight direction aligns with the goal. Strength performance is improving.',
    recommendations: 'Keep logging comparable weigh-ins. Record the same rep target.',
  }));
  expect(parsed.performance).toHaveLength(2);
  expect(parsed.recommendations).toHaveLength(2);
});
test('uses bounded non-thinking NVIDIA requests and explicit goal data', () => {
  const request = buildRequest(payload);
  expect(request.model).toBe('nvidia/nemotron-3.5-lightning-30b-a3b');
  expect(request.chat_template_kwargs.enable_thinking).toBe(false);
  expect(JSON.parse(request.messages[1].content).verifiedFacts[1]).toContain('cut');
});

test('goal judgments and missing comparisons are computed before the model', () => {
  expect(verifiedFacts(payload)[1]).toContain('aligns');
  expect(verifiedFacts({ ...payload, goal: 'maintain' })[1]).toContain('does NOT align');
  expect(verifiedFacts({ ...payload, previousWeight: null })[0]).toContain('unknown');
});
