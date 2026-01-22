#!/usr/bin/env sh
# Sets ANDROID_SDK_ROOT/ANDROID_HOME and PATH to the flake-pinned SDK if not already set.

# Only act if neither var is already provided.
if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ -z "${ANDROID_HOME:-}" ]; then
  DEVBOX_SDK_OUT=$(
    nix --extra-experimental-features 'nix-command flakes' \
      eval --raw "path:${DEVBOX_PROJECT_ROOT}/nix#android-sdk.outPath" 2>/dev/null || true
  )
  if [ -n "${DEVBOX_SDK_OUT:-}" ] && [ -d "$DEVBOX_SDK_OUT/libexec/android-sdk" ]; then
    ANDROID_SDK_ROOT="$DEVBOX_SDK_OUT/libexec/android-sdk"
    ANDROID_HOME="$ANDROID_SDK_ROOT"
  fi
fi

if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ -n "${ANDROID_HOME:-}" ]; then
  ANDROID_SDK_ROOT="$ANDROID_HOME"
fi

if [ -n "${ANDROID_SDK_ROOT:-}" ] && [ -z "${ANDROID_HOME:-}" ]; then
  ANDROID_HOME="$ANDROID_SDK_ROOT"
fi

export ANDROID_SDK_ROOT ANDROID_HOME

if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  # Prefer cmdline-tools;latest, or fall back to the highest numbered cmdline-tools folder.
  cmdline_tools_bin=""
  if [ -d "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin" ]; then
    cmdline_tools_bin="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"
  else
    cmdline_tools_dir=$(find "$ANDROID_SDK_ROOT/cmdline-tools" -maxdepth 1 -mindepth 1 -type d -not -name latest 2>/dev/null | sort -V | tail -n 1)
    if [ -n "${cmdline_tools_dir:-}" ] && [ -d "$cmdline_tools_dir/bin" ]; then
      cmdline_tools_bin="$cmdline_tools_dir/bin"
    fi
  fi

  new_path="$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools"

  if [ -n "${cmdline_tools_bin:-}" ]; then
    new_path="$new_path:$cmdline_tools_bin"
  fi

  new_path="$new_path:$ANDROID_SDK_ROOT/tools/bin:$PATH"
  PATH="$new_path"
  export PATH
  echo "Using Android SDK: $ANDROID_SDK_ROOT"
  case "$ANDROID_SDK_ROOT" in
    /nix/store/*)
      echo "Source: Nix flake (reproducible, pinned). To use your local SDK instead, set ANDROID_HOME/ANDROID_SDK_ROOT before starting devbox shell."
      ;;
    *)
      echo "Source: User/local SDK. To use the pinned Nix SDK, unset ANDROID_HOME/ANDROID_SDK_ROOT before starting devbox shell."
      ;;
  esac
else
  echo "Android SDK not set; using system PATH"
fi
