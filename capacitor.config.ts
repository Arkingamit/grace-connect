import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.graceconnect.app',
  appName: 'Grace Connect',
  webDir: 'public',
  server: {
    url: 'https://graceconnect-psi.vercel.app',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1041926673516-hft1e549snh2040b0h6g2t7s06c83697.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
