import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eyevinn.intercom',
  appName: 'Intercom',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

