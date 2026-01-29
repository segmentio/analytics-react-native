#!/usr/bin/env sh

if ! (return 0 2>/dev/null); then
  echo "scripts/android/env.sh must be sourced via scripts/run.sh or scripts/env.sh." >&2
  exit 1
fi
project_root="${PROJECT_ROOT:-}"
if [ -z "$project_root" ] && command -v git >/dev/null 2>&1; then
  project_root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$project_root" ]; then
  project_root="$(cd "$(dirname "$0")/../.." && pwd)"
fi
script_dir="$project_root/scripts/android"
if [ "${SHARED_LOADED:-}" != "1" ] || [ "${SHARED_LOADED_PID:-}" != "$$" ]; then
  # shellcheck disable=SC1090
  . "$project_root/scripts/env.sh"
fi
debug_log_script "scripts/android/env.sh"



resolve_flake_sdk_root() {
  root="${PROJECT_ROOT:-}"
  if [ -z "$root" ]; then
    root="$(cd "$script_dir/../.." && pwd)"
  fi
  output="$1"
  sdk_out=$(
    nix --extra-experimental-features 'nix-command flakes' \
      eval --raw "path:${root}/nix#${output}.outPath" 2>/dev/null || true
  )
  if [ -n "${sdk_out:-}" ] && [ -d "$sdk_out/libexec/android-sdk" ]; then
    printf '%s\n' "$sdk_out/libexec/android-sdk"
    return 0
  fi
  return 1
}

detect_sdk_root_from_sdkmanager() {
  sm=$(command -v sdkmanager 2>/dev/null || true)
  if [ -z "$sm" ]; then
    return 1
  fi
  if command -v readlink >/dev/null 2>&1; then
    sm="$(readlink "$sm" 2>/dev/null || printf '%s' "$sm")"
  fi
  sm_dir="$(cd "$(dirname "$sm")" && pwd)"
  candidates="${sm_dir}/.. ${sm_dir}/../share/android-sdk ${sm_dir}/../libexec/android-sdk ${sm_dir}/../.."
  for c in $candidates; do
    if [ -d "$c/platform-tools" ] || [ -d "$c/platforms" ] || [ -d "$c/system-images" ]; then
      printf '%s\n' "$c"
      return 0
    fi
  done
  return 1
}

prefer_local="${ANDROID_LOCAL_SDK:-}"
case "$prefer_local" in
  1 | true | TRUE | yes | YES | on | ON)
    prefer_local=1
    ;;
  *)
    prefer_local=""
    ;;
esac
if [ -n "$prefer_local" ]; then
  if [ -z "${ANDROID_SDK_ROOT:-}" ] && [ -n "${ANDROID_HOME:-}" ]; then
    ANDROID_SDK_ROOT="$ANDROID_HOME"
  fi
  if [ -n "${ANDROID_SDK_ROOT:-}" ] && [ -z "${ANDROID_HOME:-}" ]; then
    ANDROID_HOME="$ANDROID_SDK_ROOT"
  fi
else
  preferred_output="${ANDROID_SDK_FLAKE_OUTPUT:-}"
  if [ -z "$preferred_output" ]; then
    case "${TARGET_SDK:-max}" in
      min) preferred_output="android-sdk-min" ;;
      custom) preferred_output="android-sdk-custom" ;;
      *) preferred_output="android-sdk-max" ;;
    esac
  fi
  sdk_root_max=""
  sdk_root_min=""

  if [ -n "$preferred_output" ]; then
    preferred_root="$(resolve_flake_sdk_root "$preferred_output" 2>/dev/null || true)"
    if [ -n "$preferred_root" ]; then
      ANDROID_SDK_ROOT="$preferred_root"
      ANDROID_HOME="$ANDROID_SDK_ROOT"
    fi
  fi

  sdk_root_max="$(resolve_flake_sdk_root "android-sdk-max" 2>/dev/null || true)"
  sdk_root_min="$(resolve_flake_sdk_root "android-sdk" 2>/dev/null || true)"

  if [ -n "$sdk_root_max" ]; then
    ANDROID_SDK_ROOT_MAX="$sdk_root_max"
    ANDROID_HOME_MAX="$sdk_root_max"
  fi
  if [ -n "$sdk_root_min" ]; then
    ANDROID_SDK_ROOT_MIN="$sdk_root_min"
    ANDROID_HOME_MIN="$sdk_root_min"
  fi
  export ANDROID_SDK_ROOT_MAX ANDROID_HOME_MAX ANDROID_SDK_ROOT_MIN ANDROID_HOME_MIN

  if [ -n "$sdk_root_max" ]; then
    ANDROID_SDK_ROOT="$sdk_root_max"
    ANDROID_HOME="$ANDROID_SDK_ROOT"
  elif [ -n "$sdk_root_min" ]; then
    ANDROID_SDK_ROOT="$sdk_root_min"
    ANDROID_HOME="$ANDROID_SDK_ROOT"
  fi

  if [ -z "${ANDROID_SDK_ROOT:-}" ]; then
    detected_root="$(detect_sdk_root_from_sdkmanager 2>/dev/null || true)"
    if [ -n "$detected_root" ]; then
      ANDROID_SDK_ROOT="$detected_root"
      ANDROID_HOME="$ANDROID_SDK_ROOT"
    fi
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
ANDROID_ENV_LOADED=1
ANDROID_ENV_LOADED_PID="$$"

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
    if [ "${ANALYTICS_CI_DEBUG:-}" = "1" ] || [ "${DEBUG:-}" = "1" ]; then
      echo "Using Android SDK: $ANDROID_SDK_ROOT"
      case "$ANDROID_SDK_ROOT" in
      /nix/store/*)
        echo "Source: Nix flake (reproducible, pinned). To use your local SDK instead, set ANDROID_LOCAL_SDK=1 before starting devbox shell."
        ;;
      *)
        echo "Source: User/local SDK. To use the pinned Nix SDK, unset ANDROID_HOME/ANDROID_SDK_ROOT and ensure ANDROID_LOCAL_SDK is not set before starting devbox shell."
        ;;
      esac
    fi
  fi
if [ -n "${INIT_ANDROID:-}" ] && [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ] && [ -z "${ANDROID_SDK_SUMMARY_PRINTED:-}" ]; then
    ANDROID_SDK_SUMMARY_PRINTED=1
    export ANDROID_SDK_SUMMARY_PRINTED

    android_sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
    android_sdk_version="${ANDROID_BUILD_TOOLS_VERSION:-${ANDROID_CMDLINE_TOOLS_VERSION:-30.0.3}}"
    android_min_api="${ANDROID_MIN_API:-21}"
    android_max_api="${ANDROID_MAX_API:-33}"
    android_system_image_tag="${ANDROID_CUSTOM_SYSTEM_IMAGE_TAG:-${ANDROID_SYSTEM_IMAGE_TAG:-google_apis}}"
    android_system_image_abi=""
    android_target_api="${AVD_API:-${ANDROID_TARGET_API:-}}"
    android_target_source=""
    if [ -z "$android_target_api" ]; then
      case "${TARGET_SDK:-max}" in
        min)
          android_target_api="$android_min_api"
          android_target_source="min"
          ;;
        max)
          android_target_api="$android_max_api"
          android_target_source="max"
          ;;
        custom)
          android_target_api="${ANDROID_CUSTOM_API:-}"
          android_target_source="custom"
          ;;
        *)
          android_target_api="$android_max_api"
          android_target_source="max"
          ;;
      esac
    elif [ -n "${AVD_API:-}" ]; then
      android_target_source="avd"
    elif [ -n "${ANDROID_TARGET_API:-}" ]; then
      android_target_source="target"
    fi

    android_target_device="${AVD_DEVICE:-}"
    if [ -z "$android_target_device" ]; then
      case "${TARGET_SDK:-max}" in
        min) android_target_device="${ANDROID_MIN_DEVICE:-}" ;;
        max) android_target_device="${ANDROID_MAX_DEVICE:-}" ;;
        custom) android_target_device="${ANDROID_CUSTOM_DEVICE:-}" ;;
      esac
      if [ -z "$android_target_device" ]; then
        if [ -n "$android_target_api" ] && [ "$android_target_api" = "$android_min_api" ]; then
          android_target_device="${ANDROID_MIN_DEVICE:-}"
        elif [ -n "$android_target_api" ] && [ "$android_target_api" = "$android_max_api" ]; then
          android_target_device="${ANDROID_MAX_DEVICE:-}"
        fi
      fi
    fi

    candidates=""
    if [ -n "$android_sdk_root" ] && [ -n "$android_system_image_tag" ]; then
      host_arch="$(uname -m)"
      if [ "$host_arch" = "arm64" ] || [ "$host_arch" = "aarch64" ]; then
        candidates="arm64-v8a x86_64 x86"
      else
        candidates="x86_64 x86 arm64-v8a"
      fi
    fi

    if [ -n "$android_sdk_root" ] && [ -n "$android_target_api" ] && [ -n "$android_system_image_tag" ]; then
      for abi in $candidates; do
        if [ -d "$android_sdk_root/system-images/android-${android_target_api}/${android_system_image_tag}/${abi}" ]; then
          android_system_image_abi="$abi"
          break
        fi
      done
    fi

    if [ -n "$android_system_image_abi" ]; then
      android_system_image_summary="${android_system_image_tag};${android_system_image_abi}"
    else
      android_system_image_summary="$android_system_image_tag"
    fi
    if [ -n "$android_target_device" ]; then
      android_system_image_summary="${android_system_image_summary} (${android_target_device})"
    fi

    if debug_enabled; then
      if [ "${ANDROID_ENV_DEBUG_PRINTED:-}" != "1" ]; then
        ANDROID_ENV_DEBUG_PRINTED=1
        export ANDROID_ENV_DEBUG_PRINTED
        debug_dump_vars \
          ANDROID_SDK_ROOT \
          ANDROID_HOME \
          ANDROID_LOCAL_SDK \
          ANDROID_SDK_FLAKE_OUTPUT \
          ANDROID_SDK_ROOT_MIN \
          ANDROID_HOME_MIN \
          ANDROID_SDK_ROOT_MAX \
          ANDROID_HOME_MAX \
          ANDROID_MIN_API \
          ANDROID_MAX_API \
          TARGET_SDK \
          ANDROID_TARGET_API \
          ANDROID_SYSTEM_IMAGE_TAG \
          ANDROID_BUILD_TOOLS_VERSION \
          ANDROID_CMDLINE_TOOLS_VERSION
      fi
    fi

    echo "Resolved Android SDK"
    echo "  ANDROID_SDK_ROOT: ${android_sdk_root:-not set}"
    echo "  ANDROID_BUILD_TOOLS_VERSION: ${android_sdk_version:-30.0.3}"
    echo "  ANDROID_AVD_TARGET: api=${android_target_api:-not set} device=${android_target_device:-unknown} image=${android_system_image_summary:-google_apis}"
    echo "  Tip: use a local SDK with ANDROID_LOCAL_SDK=1 ANDROID_SDK_ROOT=/path/to/sdk (or ANDROID_HOME)."
  fi
else
  if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "Android SDK not set; using system PATH"
  fi
fi
