import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.graceconnect.app',
  appName: 'Grace Connect',
  webDir: 'public',
  server: {
    url: 'https://graceconnect.graceahmedabad.org',
    cleartext: true,
    allowNavigation: [
      'graceconnect.graceahmedabad.org',
      '*.graceahmedabad.org',
      // Sign in with Apple on Android runs as a web OAuth redirect, so Apple's
      // pages have to be allowed to load inside the WebView.
      'appleid.apple.com',
      'idmsa.apple.com',
      '*.apple.com',
    ]
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Web client ID — used by Android requestIdToken / strings.xml server_client_id
      androidClientId: '641349616597-i769rj34s7j08odnfurq27quo5f0jv7k.apps.googleusercontent.com',
      iosClientId: '641349616597-5npf7tgp6ifsu9evc1h4oe328rr8o12c.apps.googleusercontent.com',
      serverClientId: '641349616597-i769rj34s7j08odnfurq27quo5f0jv7k.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
