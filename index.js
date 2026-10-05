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
notifee.onBackgroundEvent(async () => {
  // The summary task owns its lifecycle. Registering this handler ensures
  // notification press/dismiss events are safely consumed while the UI is off.
});
registerSummaryNotificationEvents();

AppRegistry.registerComponent(appName, () => App);
