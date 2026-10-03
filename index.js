/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';
import { registerSummaryNotificationEvents } from './utils/summaryTask';

notifee.registerForegroundService(() => new Promise(() => {}));
registerSummaryNotificationEvents();

AppRegistry.registerComponent(appName, () => App);
