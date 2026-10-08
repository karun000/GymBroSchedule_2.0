import AsyncStorage from '@react-native-async-storage/async-storage';

const MEASUREMENT_CHANGED_KEY = '@gymbro/measurement-changed';

export const markMeasurementChanged = async () => {
  try {
    await AsyncStorage.setItem(MEASUREMENT_CHANGED_KEY, '1');
  } catch {
    // Notification bookkeeping must never make a measurement save fail.
  }
};

export const consumeMeasurementChanged = async () => {
  try {
    const changed = await AsyncStorage.getItem(MEASUREMENT_CHANGED_KEY);
    if (changed !== '1') return false;
    await AsyncStorage.removeItem(MEASUREMENT_CHANGED_KEY);
    return true;
  } catch {
    return false;
  }
};
