import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.graceconnect.app',
  appName: 'Grace Connect',
  webDir: 'public',
  server: {
    url: 'https://graceconnect.graceahmedabad.org',
    cleartext: true,
    allowNavigation: ['graceconnect.graceahmedabad.org', '*.graceahmedabad.org']
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '641349616597-i769rj34s7j08odnfurq27quo5f0jv7k.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
