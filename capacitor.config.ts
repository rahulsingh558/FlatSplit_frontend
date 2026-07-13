import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flatsplit.app',
  appName: 'FlatSplit',
  server: {
    url: 'https://flatsplit.meals4heal.in',
    cleartext: true,
    allowNavigation: [
      'accounts.google.com',
      '*.google.com',
      '*.googleusercontent.com',
      'flatsplit.meals4heal.in'
    ]
  },
  overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
};

export default config;
