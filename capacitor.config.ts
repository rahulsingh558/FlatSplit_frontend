import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flatsplit.app',
  appName: 'FlatSplit',
  server: {
    url: 'https://flatsplit.meals4heal.in',
    cleartext: true
  }
};

export default config;
