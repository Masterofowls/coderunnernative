import type { ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext) => ({
  ...config,
  name: 'CodeRunner Native',
  slug: 'coderunner-native',
  version: '1.1.0',
  orientation: 'default' as const,
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark' as const,
  scheme: 'coderunnernative',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain' as const,
    backgroundColor: '#0f1419',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.coderunner.python',
  },
  android: {
    package: 'com.coderunner.python',
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: '#0f1419',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['INTERNET', 'ACCESS_NETWORK_STATE'],
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-dev-client', 'expo-sharing'],
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '00000000-0000-4000-8000-000000000000',
    },
  },
});
