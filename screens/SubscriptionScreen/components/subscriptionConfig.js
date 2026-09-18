// ─── subscriptionConfig.js ────────────────────────────────────────────────
// Shared config + pure helpers for the Subscription screen.

export const SUBSCRIPTION_COLLECTION = 'userSubscriptions';
export const SUBSCRIPTION_DOC_ID = 'current';

export const DURATION_OPTIONS = [1, 3, 6, 12];

export const CURRENCIES = ['NPR', 'INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'AED'];
export const DEFAULT_CURRENCY = 'NPR';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const startOfDay = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value ?? Date.now());
  date.setHours(0, 0, 0, 0);
  return date;
};

// Handles month overflow correctly (Jan 31 + 1 month -> Feb 28/29).
export const addMonths = (value, months) => {
  const result = startOfDay(value);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + Number(months));
  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, daysInTargetMonth));
  return result;
};

export const formatDate = (value) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatAmount = (amount, currency = DEFAULT_CURRENCY) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return `${currency} ${value.toFixed(currency === 'JPY' ? 0 : 2)}`;
};

// Single source of truth for the "one subscription" rule.
export const getSubscriptionState = (subscription) => {
  const hasSubscription = !!subscription && (subscription.kind === 'gym' || (!!subscription.tier && subscription.tier !== 'free'));

  if (!hasSubscription) {
    return { hasSubscription: false, isActive: false, isExpired: false, daysLeft: 0 };
  }

  const end = subscription.endDate ? new Date(subscription.endDate) : null;
  const endValid = !!end && !Number.isNaN(end.getTime());
  const start = subscription.startDate ? new Date(subscription.startDate) : null;
  const isUpcoming = !!start && start.getTime() > Date.now();
  const isExpired = endValid ? end.getTime() <= Date.now() : false;

  return {
    hasSubscription: true,
    isActive: subscription.status !== 'cancelled' && !isExpired,
    isExpired,
    isUpcoming,
    daysLeft: endValid ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000)) : null,
  };
};
export const dateInputValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const parseDateInput = (text) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

export const getRenewalStart = (subscription, selectedDate) => {
  const end = subscription?.endDate ? new Date(subscription.endDate) : null;
  return end && end > selectedDate && end > new Date() ? startOfDay(end) : startOfDay(selectedDate);
};

export const buildGymSubscription = ({ current, mode, amount, currency, paymentDate, startDate, endDate, durationMonths, now = new Date() }) => {
  const exists = getSubscriptionState(current).hasSubscription;
  if (mode === 'create' && exists) throw new Error('You already have a gym subscription. Renew it instead.');
  if (mode === 'renew' && !exists) throw new Error('Your gym subscription no longer exists. Refresh and try again.');
  if (!Number.isFinite(amount) || amount <= 0 || !CURRENCIES.includes(currency)) throw new Error('Enter a valid amount and currency.');
  if (![paymentDate, startDate, endDate].every(date => date instanceof Date && Number.isFinite(date.getTime()))) throw new Error('Enter valid dates.');
  if (endDate <= startDate) throw new Error('End date must be after the membership start date.');
  if (!DURATION_OPTIONS.includes(durationMonths)) throw new Error('Select a valid duration.');
  const timestamp = now.toISOString();
  return {
    kind: 'gym', amount, currency, durationMonths, status: 'active',
    paymentDate: paymentDate.toISOString(), startDate: startDate.toISOString(), endDate: endDate.toISOString(),
    createdAt: current?.createdAt ?? timestamp, updatedAt: timestamp,
    renewals: mode === 'renew' ? [...(current.renewals ?? []), {
      amount, currency, paymentDate: paymentDate.toISOString(), startDate: startDate.toISOString(),
      durationMonths, renewedAt: timestamp, previousEndDate: current.endDate ?? null, newEndDate: endDate.toISOString(),
    }] : [],
  };
};
