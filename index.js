/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';
import {
  registerSummaryNotificationEvents,
  runSummaryForegroundService,
} from './utils/summaryTask';

notifee.registerForegroundService(runSummaryForegroundService);
registerSummaryNotificationEvents();

AppRegistry.registerComponent(appName, () => App);
