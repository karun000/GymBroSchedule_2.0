import { getLocalDateKey, shouldSendDailyReminder } from '../utils/appOpenReminder';

describe('daily app open reminder', () => {
  it('does not remind when the app was opened earlier the same day', () => {
    const now = new Date('2026-09-05T08:00:00');

    expect(
      shouldSendDailyReminder({
        lastOpenedAt: '2026-09-05T07:30:00',
        now,
        lastNotifiedForDay: null,
      })
    ).toBe(false);
  });

  it('reminds once the app is still unopened past the reminder time', () => {
    const now = new Date('2026-09-05T21:00:00');

    expect(
      shouldSendDailyReminder({
        lastOpenedAt: '2026-09-04T18:00:00',
        now,
        lastNotifiedForDay: null,
      })
    ).toBe(true);
  });

  it('prevents duplicate reminders for the same day', () => {
    const now = new Date('2026-09-05T21:30:00');

    expect(
      shouldSendDailyReminder({
        lastOpenedAt: '2026-09-04T18:00:00',
        now,
        lastNotifiedForDay: '2026-09-05',
      })
    ).toBe(false);
  });

  it('formats local date keys consistently', () => {
    expect(getLocalDateKey(new Date('2026-09-05T21:30:00'))).toBe('2026-09-05');
  });
});
