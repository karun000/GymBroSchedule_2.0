import { addMonths, dateInputValue, parseDateInput, getRenewalStart, getSubscriptionState, buildGymSubscription, formatAmount } from '../screens/SubscriptionScreen/components/subscriptionConfig';

afterEach(() => jest.useRealTimers());

test('typed dates are local dates and reject impossible dates', () => {
  expect(dateInputValue(parseDateInput('2026-09-18'))).toBe('2026-09-18');
  expect(parseDateInput('2026-02-29')).toBeNull();
  expect(parseDateInput('2026-13-01')).toBeNull();
  expect(parseDateInput('09/18/2026')).toBeNull();
});

test('month extensions clamp to the last day including leap years', () => {
  expect(dateInputValue(addMonths(new Date(2024, 0, 31), 1))).toBe('2024-02-29');
  expect(dateInputValue(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
});

test('renewal preserves remaining time and honors a later selected date', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 18));
  const current = { tier: 'basic', endDate: new Date(2026, 9, 18).toISOString() };
  expect(dateInputValue(getRenewalStart(current, new Date(2026, 8, 18)))).toBe('2026-10-18');
  expect(dateInputValue(getRenewalStart(current, new Date(2026, 10, 18)))).toBe('2026-11-18');
  expect(dateInputValue(getRenewalStart({ endDate: new Date(2026, 7, 18).toISOString() }, new Date(2026, 8, 18)))).toBe('2026-09-18');
});

test('expired and upcoming subscriptions still count toward the single subscription limit', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 18));
  expect(getSubscriptionState({ tier: 'basic', endDate: new Date(2026, 7, 18).toISOString() })).toMatchObject({ hasSubscription: true, isExpired: true });
  expect(getSubscriptionState({ tier: 'basic', startDate: new Date(2026, 9, 18).toISOString(), endDate: new Date(2026, 10, 18).toISOString() })).toMatchObject({ hasSubscription: true, isUpcoming: true });
});

const gymInput = {
  mode: 'create', current: null, amount: 2500, currency: 'NPR', durationMonths: 1,
  paymentDate: new Date(2026, 8, 18), startDate: new Date(2026, 8, 18), endDate: new Date(2026, 9, 18),
};

test('creates a gym record with separate payment dates and selected currency', () => {
  const record = buildGymSubscription(gymInput);
  expect(record).toMatchObject({ kind: 'gym', currency: 'NPR', amount: 2500, renewals: [] });
  expect(record.paymentDate).toBe(gymInput.paymentDate.toISOString());
  expect(record).not.toHaveProperty('tier');
  expect(record).not.toHaveProperty('features');
  expect(getSubscriptionState(record).hasSubscription).toBe(true);
  expect(formatAmount(2500, 'NPR')).toBe('NPR 2500.00');
  expect(formatAmount(2500, 'JPY')).toBe('JPY 2500');
});

test('rejects a second record even when the gym membership has expired', () => {
  const current = buildGymSubscription(gymInput);
  expect(() => buildGymSubscription({ ...gymInput, current })).toThrow('already have');
});

test('renewal updates payment details and retains currency in each history entry', () => {
  const current = buildGymSubscription(gymInput);
  const first = buildGymSubscription({ ...gymInput, mode: 'renew', current, currency: 'USD', amount: 25 });
  const next = buildGymSubscription({ ...gymInput, mode: 'renew', current: first, currency: 'INR', amount: 2000 });
  expect(next.renewals.map(item => item.currency)).toEqual(['USD', 'INR']);
  expect(next.createdAt).toBe(current.createdAt);
  expect(next.currency).toBe('INR');
});

test('rejects invalid gym payment details and reversed end dates', () => {
  for (const invalid of [{ amount: -1 }, { currency: 'INVALID' }, { paymentDate: null }, { endDate: new Date(2026, 7, 18) }]) {
    expect(() => buildGymSubscription({ ...gymInput, ...invalid })).toThrow();
  }
});
