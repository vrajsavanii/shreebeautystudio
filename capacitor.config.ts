import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shreebeautystudio.app',
  appName: 'Shree Beauty Studio',
  webDir: 'public',
  server: {
    // Connects mobile app directly to the live hosted Vercel deployment
    url: 'https://shree-beauty-studio.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
