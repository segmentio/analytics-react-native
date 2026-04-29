# Devbox Usage Guide

## Quick Start

### iOS Development

```bash
# Skip Android setup to speed up initialization
devbox run -e ANDROID_SKIP_SETUP=1 start:ios
devbox run -e ANDROID_SKIP_SETUP=1 build:ios
```

### Android Development

```bash
# Skip iOS setup to speed up initialization
devbox run -e IOS_SKIP_SETUP=1 start:android
devbox run -e IOS_SKIP_SETUP=1 build:android
```

### Both Platforms

```bash
# No skip flags needed
devbox run install
devbox run start:metro
```

## Available Scripts

### Installation

- `install` - Install yarn dependencies
- `install:pods` - Install CocoaPods dependencies

### Development

- `start:ios` - Start iOS simulator
- `start:android` - Start Android emulator
- `start:metro` - Start Metro bundler
- `start:app` - Start the app

### Build

- `build:ios` - Build iOS app
- `build:android` - Build Android app

### Testing

- `test:e2e:ios` - Run iOS E2E tests
- `test:e2e:android` - Run Android E2E tests

### Cleanup

- `stop:sim` - Stop iOS simulator
- `stop:emu` - Stop Android emulator
- `stop:metro` - Stop Metro bundler

## Performance Tips

**Android SDK Warning on macOS**
If you see Android SDK Nix flake evaluation warnings on macOS when running iOS commands, use:

```bash
devbox run -e ANDROID_SKIP_SETUP=1 <command>
```

This skips the Android SDK evaluation which can fail on macOS but doesn't affect iOS development.

**iOS-only or Android-only Development**
Set the skip flag in your shell:

```bash
export ANDROID_SKIP_SETUP=1  # For iOS-only work
# or
export IOS_SKIP_SETUP=1      # For Android-only work
```

Then all devbox commands will skip the unnecessary platform setup.
