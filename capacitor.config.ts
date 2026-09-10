import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medstead.transport',
  appName: 'MedStead',
  webDir: 'ios-shell-www',
  server: {
    url: 'https://www.medsteadtransport.com',
    cleartext: false,
  },
};

export default config;
