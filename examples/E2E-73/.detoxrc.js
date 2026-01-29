const {execSync} = require('child_process');

const resolveGradleCmd = () => {
  if (process.env.GRADLE_CMD) {
    return process.env.GRADLE_CMD;
  }
  try {
    execSync('command -v gradle', {stdio: 'ignore'});
    return 'gradle';
  } catch (_) {
    return './gradlew';
  }
};

const gradleCmd = resolveGradleCmd();

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
      forceExit: process.env.CI ? true : undefined,
    },
    jest: {
      setupTimeout: 120000,
    },
    detached: !!process.env.CI,
    retries: 3,
  },
  behavior: {
    init: {
      reinstallApp: true,
      exposeGlobals: false,
    },
    launchApp: 'auto',
    cleanup: {
      shutdownDevice: false,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Debug-iphonesimulator/AnalyticsReactNativeE2E.app',
      build:
        'xcodebuild -workspace ios/AnalyticsReactNativeE2E.xcworkspace -scheme AnalyticsReactNativeE2E -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Release-iphonesimulator/AnalyticsReactNativeE2E.app',
      build:
        'xcodebuild -workspace ios/AnalyticsReactNativeE2E.xcworkspace -scheme AnalyticsReactNativeE2E -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        `cd android && ${gradleCmd} assembleDebug assembleAndroidTest -DtestBuildType=debug`,
      reversePorts: [8081],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build:
        `cd android && ${gradleCmd} assembleRelease assembleAndroidTest -DtestBuildType=release`,
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
      },
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_3a_API_32',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug',
    },
    'android.att.release': {
      device: 'attached',
      app: 'android.release',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
};
