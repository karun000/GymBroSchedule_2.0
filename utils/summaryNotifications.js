import { NativeModules, Platform } from 'react-native';

const nativeNotifications = NativeModules.SummaryNotifications;

export const startSummaryProcessing = () => {
  if (Platform.OS === 'android') nativeNotifications?.startProcessing?.();
};

export const finishSummaryProcessing = (summaryText) => {
  if (Platform.OS === 'android') nativeNotifications?.finishProcessing?.(summaryText || null);
};

export const failSummaryProcessing = () => {
  if (Platform.OS === 'android') nativeNotifications?.failProcessing?.();
};
