export const APP_OPEN_LAST_OPENED_KEY = 'gymbro:last-opened-at';
export const APP_OPEN_LAST_NOTIFIED_KEY = 'gymbro:last-notified-day';
export const DEFAULT_REMINDER_HOUR = 21;
export const DEFAULT_REMINDER_MINUTE = 0;

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shouldSendDailyReminder({
  lastOpenedAt,
  now = new Date(),
  lastNotifiedForDay = null,
  reminderHour = DEFAULT_REMINDER_HOUR,
  reminderMinute = DEFAULT_REMINDER_MINUTE,
} = {}) {
  if (!lastOpenedAt) {
    return false;
  }

  const rightNow = new Date(now);
  const reminderTime = new Date(rightNow);
  reminderTime.setHours(reminderHour, reminderMinute, 0, 0);

  if (rightNow < reminderTime) {
    return false;
  }

  const todayKey = getLocalDateKey(rightNow);
  if (lastNotifiedForDay === todayKey) {
    return false;
  }

  const lastOpenedDate = new Date(lastOpenedAt);
  if (getLocalDateKey(lastOpenedDate) === todayKey) {
    return false;
  }

  return true;
}
