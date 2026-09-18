import { createSummaryCache } from '../utils/aiSummaryCache';

const records = { prs: [{ id: 'p1' }], measurements: [{ id: 'm1' }] };
let storage;
let generate;
beforeEach(() => {
  const values = new Map();
  storage = {
    getItem: jest.fn(async key => values.get(key) || null),
    setItem: jest.fn(async (key, value) => { values.set(key, value); }),
  };
  generate = jest.fn(async () => ({ progressSummary: 'Saved response' }));
});

test('persists across restarts and reuses the result for edits and deletions', async () => {
  await createSummaryCache(storage)('user', records, generate);
  const cache = createSummaryCache(storage);
  await cache('user', { ...records, prs: [{ id: 'p1', weight: 99 }] }, generate);
  await cache('user', { prs: [], measurements: [] }, generate);
  await cache('user', records, generate);
  expect(generate).toHaveBeenCalledTimes(1);
});

test('any added PR or measurement triggers a new call, independently of values', async () => {
  const cache = createSummaryCache(storage);
  await cache('user', records, generate);
  const withPr = { ...records, prs: [...records.prs, { id: 'p2' }] };
  await cache('user', withPr, generate);
  const withMeasurement = { ...withPr, measurements: [...records.measurements, { id: 'm2', waist: 80 }] };
  await cache('user', withMeasurement, generate);
  await cache('user', withMeasurement, generate);
  expect(generate).toHaveBeenCalledTimes(3);
});

test('concurrent requests share one generation and accounts are isolated', async () => {
  const cache = createSummaryCache(storage);
  await Promise.all(Array.from({ length: 5 }, () => cache('user', records, generate)));
  expect(generate).toHaveBeenCalledTimes(1);
  await cache('another-user', records, generate);
  expect(generate).toHaveBeenCalledTimes(2);
});

test('failed generations do not replace the last successful cache', async () => {
  const cache = createSummaryCache(storage);
  await cache('user', records, generate);
  const added = { ...records, prs: [...records.prs, { id: 'p2' }] };
  generate.mockRejectedValueOnce(new Error('Offline'));
  await expect(cache('user', added, generate)).rejects.toThrow('Offline');
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  await cache('user', added, generate);
  expect(generate).toHaveBeenCalledTimes(3);
});
