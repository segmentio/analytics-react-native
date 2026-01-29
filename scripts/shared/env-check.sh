#!/usr/bin/env sh
set -eu

echo "=== Environment Check ==="
date
uname -a
echo

if command -v sw_vers >/dev/null 2>&1; then
  sw_vers
fi
echo

if command -v xcode-select >/dev/null 2>&1; then
  echo "xcode-select: $(xcode-select -p 2>/dev/null || true)"
fi

if command -v xcodebuild >/dev/null 2>&1; then
  xcodebuild -version
  xcodebuild -showsdks
fi
echo

if command -v xcrun >/dev/null 2>&1; then
  sdk_path="$(xcrun --sdk iphonesimulator --show-sdk-path 2>/dev/null || true)"
  platform_path="$(xcrun --sdk iphonesimulator --show-sdk-platform-path 2>/dev/null || true)"
  swift_toolchain_path="$(xcrun --sdk iphonesimulator --show-sdk-toolchain-path 2>/dev/null || true)"
  echo "iphonesimulator sdk path: ${sdk_path:-unknown}"
  echo "iphonesimulator platform path: ${platform_path:-unknown}"
  echo "iphonesimulator toolchain path: ${swift_toolchain_path:-unknown}"
fi
echo

toolchain_swift_dir="$(xcode-select -p 2>/dev/null)/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/iphonesimulator"
sdk_swift_dir="${sdk_path:-}/usr/lib/swift"

echo "Swift toolchain libs (simulator): ${toolchain_swift_dir}"
ls -la "$toolchain_swift_dir" 2>/dev/null || true
echo

echo "Swift runtime libs (SDK): ${sdk_swift_dir}"
ls -la "$sdk_swift_dir" 2>/dev/null || true
echo

for lib in swiftCompatibilityPacks swiftCompatibility56 swiftCompatibilityConcurrency; do
  toolchain_dylib="${toolchain_swift_dir}/lib${lib}.dylib"
  toolchain_static="${toolchain_swift_dir}/lib${lib}.a"
  sdk_dylib="${sdk_swift_dir}/lib${lib}.dylib"
  sdk_static="${sdk_swift_dir}/lib${lib}.a"
  if [ -e "$toolchain_dylib" ]; then
    echo "FOUND toolchain ${lib}: ${toolchain_dylib}"
  elif [ -e "$toolchain_static" ]; then
    echo "FOUND toolchain ${lib}: ${toolchain_static}"
  elif [ -e "$sdk_dylib" ]; then
    echo "FOUND sdk ${lib}: ${sdk_dylib}"
  elif [ -e "$sdk_static" ]; then
    echo "FOUND sdk ${lib}: ${sdk_static}"
  else
    echo "MISSING ${lib}"
  fi
done
