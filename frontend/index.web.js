/**
 * Web entry point. Servido por Metro en http://localhost:8081.
 * El / de Metro es atendido por web/index.html (ver metro.config.js).
 *
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, { rootTag: document.getElementById('root') });