const serverUrl = process.env.CAP_SERVER_URL;

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.yourname.perfectcatch',
  appName: 'Perfect Catch',
  webDir: 'dist',
  plugins: {
    SplashScreen: { launchShowDuration: 0 },
  },
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
          allowNavigation: [new URL(serverUrl).host],
        },
      }
    : {}),
};

module.exports = config;
