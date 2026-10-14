import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shreebeautystudio.app',
  appName: 'Shree Beauty Studio',
  webDir: 'public',
  server: {
    // Connects mobile app directly to the official production domain
    url: 'https://shreebeauty.studio',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'disable',
      style: 'DARK',
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#032B30',
    },
  },
};

export default config;
