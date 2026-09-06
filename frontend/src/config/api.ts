import { Platform } from 'react-native';

const DEV_HOST = '192.168.1.107';

export const API_HOST = Platform.select({
  android: __DEV__ ? DEV_HOST : '10.0.2.2',
  ios: __DEV__ ? DEV_HOST : '127.0.0.1',
  default: __DEV__ ? DEV_HOST : '127.0.0.1',
}) ?? DEV_HOST;

export const API_PORT = 3000;
export const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;
