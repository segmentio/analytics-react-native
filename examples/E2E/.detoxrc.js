const {execSync} = require('child_process');

const defaultIOSDeviceCandidates = (() => {
  const fromEnv = (process.env.IOS_DEVICE_NAMES || 'iPhone 14')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);
  return Array.from(new Set(['iPhone 17', ...fromEnv, 'iPhone 14']));
})();

const safeParseJSON = cmd => {
  try {
    return JSON.parse(
      execSync(cmd, {stdio: ['ignore', 'pipe', 'ignore']}).toString(),
    );
  } catch (_) {
    return null;
  }
};

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

const listAvailableDevices = () => {
  const parsed = safeParseJSON('xcrun simctl list devices -j');
  if (!parsed || !parsed.devices) return [];
  const devices = [];
  Object.values(parsed.devices).forEach(group => {
    (group || []).forEach(device => {
      if (device.isAvailable || device.availability === '(available)') {
        devices.push(device);
      }
    });
  });
  return devices;
};

const listAvailableDeviceTypes = () => {
  const parsed = safeParseJSON('xcrun simctl list devicetypes -j');
  if (!parsed || !parsed.devicetypes) return new Set();
  return new Set(parsed.devicetypes.map(dt => dt.name.toLowerCase()));
};

const baseName = name => name.split(' (')[0].trim().toLowerCase();

const detectIOSDevice = () => {
  if (process.env.DETOX_IOS_DEVICE) {
    return {type: process.env.DETOX_IOS_DEVICE};
  }

  const devices = listAvailableDevices();
  const preferredDevice = defaultIOSDeviceCandidates.find(candidate =>
    devices.some(d => baseName(d.name) === candidate.toLowerCase()),
  );
  if (preferredDevice) {
    const found = devices.find(
      d => baseName(d.name) === preferredDevice.toLowerCase(),
    );
    if (found) return {name: found.name};
  }
  const anyIphoneDevice = devices.find(d =>
    d.name.toLowerCase().includes('iphone'),
  );
  if (anyIphoneDevice) return {name: anyIphoneDevice.name};

  const availableTypes = listAvailableDeviceTypes();
  const preferredType = defaultIOSDeviceCandidates.find(candidate =>
    availableTypes.has(candidate.toLowerCase()),
  );
  if (preferredType) return {type: preferredType};

  const anyIphoneType = Array.from(availableTypes).find(t =>
    t.includes('iphone'),
  );
  if (anyIphoneType) return {type: anyIphoneType};

  return {type: defaultIOSDeviceCandidates[0]};
};

const iosDevice = detectIOSDevice();

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
      forceExit: process.env.CI ? true : undefined,
    },
    jest: {
      setupTimeout: 240000,
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
        // Allow CI/local override; defaults to an available simulator by name (or type fallback).
        ...iosDevice,
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
        // Default to latest AVD name (arch-aware); override via DETOX_AVD. For minsdk testing, set DETOX_AVD to an API 21 AVD.
        avdName: (() => {
          if (process.env.DETOX_AVD) return process.env.DETOX_AVD;
          const arch = require('os').arch();
          return arch === 'arm64'
            ? 'medium_phone_API33_arm64_v8a'
            : 'medium_phone_API33_x86_64';
        })(),
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
