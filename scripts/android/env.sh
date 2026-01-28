#!/usr/bin/env bash
# Sets ANDROID_SDK_ROOT/ANDROID_HOME and PATH to the flake-pinned SDK if not already set.

# Load shared platform versions if present.
script_path="${BASH_SOURCE[0]:-$0}"
script_dir="$(cd "$(dirname "$script_path")" && pwd)"
# shellcheck disable=SC1090
. "$script_dir/../shared/common.sh"
load_platform_versions "$script_dir"

if [ -z "${PLATFORM_ANDROID_MIN_API:-}" ]; then
  if ! command -v jq >/dev/null 2>&1; then
    if [ -n "${DEVBOX_PACKAGES_DIR:-}" ] && [ -x "$DEVBOX_PACKAGES_DIR/bin/jq" ]; then
      PATH="$DEVBOX_PACKAGES_DIR/bin:$PATH"
    fi
  fi
  project_root="${PROJECT_ROOT:-${DEVBOX_PROJECT_ROOT:-}}"
  if [ -z "$project_root" ]; then
    project_root="$(cd "$script_dir/../.." && pwd)"
  fi
  # shellcheck disable=SC1090
  . "$project_root/scripts/platform-versions.sh"
fi

if [ -z "${ANDROID_MIN_API:-}" ] && [ -n "${PLATFORM_ANDROID_MIN_API:-}" ]; then
  ANDROID_MIN_API="$PLATFORM_ANDROID_MIN_API"
fi
if [ -z "${ANDROID_MAX_API:-}" ] && [ -n "${PLATFORM_ANDROID_MAX_API:-}" ]; then
  ANDROID_MAX_API="$PLATFORM_ANDROID_MAX_API"
fi
if [ -z "${ANDROID_BUILD_TOOLS_VERSION:-}" ] && [ -n "${PLATFORM_ANDROID_BUILD_TOOLS_VERSION:-}" ]; then
  ANDROID_BUILD_TOOLS_VERSION="$PLATFORM_ANDROID_BUILD_TOOLS_VERSION"
fi
if [ -z "${ANDROID_CMDLINE_TOOLS_VERSION:-}" ] && [ -n "${PLATFORM_ANDROID_CMDLINE_TOOLS_VERSION:-}" ]; then
  ANDROID_CMDLINE_TOOLS_VERSION="$PLATFORM_ANDROID_CMDLINE_TOOLS_VERSION"
fi
if [ -z "${ANDROID_SYSTEM_IMAGE_TAG:-}" ] && [ -n "${PLATFORM_ANDROID_SYSTEM_IMAGE_TAG:-}" ]; then
  ANDROID_SYSTEM_IMAGE_TAG="$PLATFORM_ANDROID_SYSTEM_IMAGE_TAG"
fi

# Only act if neither var is already provided.
if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ -z "${ANDROID_HOME:-}" ]; then
  project_root="${PROJECT_ROOT:-${DEVBOX_PROJECT_ROOT:-}}"
  if [ -z "$project_root" ]; then
    project_root="$(cd "$script_dir/../.." && pwd)"
  fi
  flake_output="${ANDROID_SDK_FLAKE_OUTPUT:-android-sdk}"
  DEVBOX_SDK_OUT=$(
    nix --extra-experimental-features 'nix-command flakes' \
      eval --raw "path:${project_root}/nix#${flake_output}.outPath" 2>/dev/null || true
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
export ANDROID_BUILD_TOOLS_VERSION

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
  if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "Using Android SDK: $ANDROID_SDK_ROOT"
    case "$ANDROID_SDK_ROOT" in
    /nix/store/*)
      echo "Source: Nix flake (reproducible, pinned). To use your local SDK instead, set ANDROID_HOME/ANDROID_SDK_ROOT before starting devbox shell."
      ;;
    *)
      echo "Source: User/local SDK. To use the pinned Nix SDK, unset ANDROID_HOME/ANDROID_SDK_ROOT before starting devbox shell."
      ;;
    esac
  fi
  if [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ] && [ -z "${DEVBOX_ANDROID_SDK_SUMMARY_PRINTED:-}" ]; then
    DEVBOX_ANDROID_SDK_SUMMARY_PRINTED=1
    export DEVBOX_ANDROID_SDK_SUMMARY_PRINTED

    android_sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
    android_sdk_version="${ANDROID_BUILD_TOOLS_VERSION:-${PLATFORM_ANDROID_BUILD_TOOLS_VERSION:-${ANDROID_CMDLINE_TOOLS_VERSION:-${PLATFORM_ANDROID_CMDLINE_TOOLS_VERSION:-30.0.3}}}}"
    android_min_api="${ANDROID_MIN_API:-${PLATFORM_ANDROID_MIN_API:-21}}"
    android_max_api="${ANDROID_MAX_API:-${PLATFORM_ANDROID_MAX_API:-33}}"
    android_system_image_tag="${ANDROID_SYSTEM_IMAGE_TAG:-${PLATFORM_ANDROID_SYSTEM_IMAGE_TAG:-google_apis}}"

    echo "Resolved Android SDK"
    echo "  SDK: ${android_sdk_root:-not set}"
    echo "  Tools: ${android_sdk_version:-30.0.3}"
    echo "  Min API: ${android_min_api:-21}"
    echo "  Max API: ${android_max_api:-33}"
    echo "  System Image: ${android_system_image_tag:-google_apis}"
  fi
else
  if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "Android SDK not set; using system PATH"
  fi
fi
