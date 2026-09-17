import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

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
  ios: {
    contentInset: 'never',
    scrollEnabled: true,
    backgroundColor: '#FAF7F2',
  },
  android: {
    backgroundColor: '#FAF7F2',
  },
  plugins: {
    // iOS: leave WebView size alone (panels use visualViewport / keyboard inset).
    // Android: resizeOnFullScreen shrinks the WebView with the IME. Combined with
    // MainActivity adjustResize + decorFitsSystemWindows, this avoids overlay gaps.
    // JS keyboard inset stays 0 on Android so we never double-subtract.
    Keyboard: {
      resize: KeyboardResize.None,
      resizeOnFullScreen: true,
    },
    // Capacitor >= 8.4 pads the WebView by the IME height on Android 15+.
    // MainActivity already resizes via decorFitsSystemWindows + adjustResize,
    // so both together shrink the WebView twice (black gap above keyboard).
    SystemBars: {
      insetsHandling: 'disable',
    },
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
