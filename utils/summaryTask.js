import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
  AndroidImportance,
  AndroidStyle,
  AuthorizationStatus,
  EventType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { generateFitnessSummary } from '../FireBase/ai';

const CHANNEL_ID = 'gymbro-summary';
const NOTIFICATION_ID = 'gymbro-summary-generation';
const STATE_KEY = '@gymbro_summary_task_state';

let currentTask = null;
let notificationSetup = null;
let finishForegroundTask = null;
let foregroundTaskCompleted = false;
const listeners = new Set();

export const runSummaryForegroundService = () => {
  if (foregroundTaskCompleted) return Promise.resolve();
  return new Promise((resolve) => {
    finishForegroundTask = resolve;
  });
};

const emit = (state) => {
  listeners.forEach((listener) => listener(state));
};

export const subscribeToSummaryTask = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSummaryTaskState = async () => {
  try {
    const saved = await AsyncStorage.getItem(STATE_KEY);
    return saved ? JSON.parse(saved) : { status: 'idle' };
  } catch {
    return { status: 'idle' };
  }
};

const saveState = async (state) => {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  emit(state);
};

const ensureNotifications = async () => {
  if (notificationSetup) return notificationSetup;

  notificationSetup = (async () => {
    const settings = await notifee.getNotificationSettings();
    if (settings.authorizationStatus === AuthorizationStatus.NOT_DETERMINED) {
      await notifee.requestPermission();
    }

    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'GymBro progress',
        importance: AndroidImportance.DEFAULT,
      });
    }
  })();

  try {
    await notificationSetup;
  } catch (error) {
    notificationSetup = null;
    throw error;
  }
};

const notification = (title, body, ongoing = true) => ({
  id: NOTIFICATION_ID,
  title,
  body,
  android: {
    channelId: CHANNEL_ID,
    smallIcon: 'ic_notification',
    largeIcon: 'ic_launcher',
    ongoing,
    onlyAlertOnce: true,
    pressAction: { id: 'default' },
    ...(ongoing ? { asForegroundService: true } : {}),
    style: { type: AndroidStyle.BIGTEXT, text: body },
  },
  ios: { sound: ongoing ? undefined : 'default' },
});

export const startSummaryTask = async ({ goal, forceRefresh = false }) => {
  if (currentTask) return currentTask;

  currentTask = (async () => {
    foregroundTaskCompleted = false;
    try {
      await ensureNotifications();
      const started = { status: 'running', startedAt: new Date().toISOString() };
      await saveState(started);
      await notifee.displayNotification(notification('GymBro', 'Updating your fitness summary…'));

      // Keep the existing API call and arguments unchanged.
      const result = await generateFitnessSummary({ goal, forceRefresh });
      const completed = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        result,
      };
      await saveState(completed);
      await notifee.displayNotification(notification('GymBro', 'Your fitness summary is ready.', false));
      return result;
    } catch (error) {
      await saveState({ status: 'failed', error: error?.message || 'Unable to update your summary.' });
      try {
        await notifee.displayNotification(notification('GymBro', 'Could not update your fitness summary.', false));
      } catch { /* notification setup may be the failed operation */ }
      throw error;
    } finally {
      if (Platform.OS === 'android') {
        foregroundTaskCompleted = true;
        finishForegroundTask?.();
        finishForegroundTask = null;
        try { await notifee.stopForegroundService(); } catch { /* service may not be active */ }
      }
      currentTask = null;
    }
  })();

  return currentTask;
};

export const registerSummaryNotificationEvents = () => {
  notifee.onForegroundEvent(({ type }) => {
    if (type === EventType.PRESS) emit({ status: 'opened' });
  });
};

export const SUMMARY_NOTIFICATION_ID = NOTIFICATION_ID;
