{
  description = "Slim Android SDK tools for Devbox via flakes";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      versionData = builtins.fromJSON (builtins.readFile ../scripts/env-defaults.json);
      defaultsData = if builtins.hasAttr "defaults" versionData then versionData.defaults else versionData;
      getVar =
        name: default:
        if builtins.hasAttr name defaultsData then toString (builtins.getAttr name defaultsData) else default;

      androidSdkConfig = {
        platformVersions = [
          (getVar "PLATFORM_ANDROID_MIN_API" "21")
          (getVar "PLATFORM_ANDROID_MAX_API" "33")
        ];
        buildToolsVersion = getVar "PLATFORM_ANDROID_BUILD_TOOLS_VERSION" "30.0.3";
        cmdLineToolsVersion = getVar "PLATFORM_ANDROID_CMDLINE_TOOLS_VERSION" "19.0";
        systemImageTypes = [ (getVar "PLATFORM_ANDROID_SYSTEM_IMAGE_TAG" "google_apis") ];
      };
      androidSdkConfigMin = androidSdkConfig // {
        platformVersions = [ (getVar "PLATFORM_ANDROID_MIN_API" "21") ];
      };
      androidSdkConfigMax = androidSdkConfig // {
        platformVersions = [ (getVar "PLATFORM_ANDROID_MAX_API" "33") ];
      };

      forAllSystems =
        f:
        builtins.listToAttrs (
          map (system: {
            name = system;
            value = f system;
          }) systems
        );
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs {
            inherit system;
            config = {
              allowUnfree = true;
              android_sdk.accept_license = true;
            };
          };

          abiVersions = if builtins.match "aarch64-.*" system != null then [ "arm64-v8a" ] else [ "x86_64" ];

          androidPkgs =
            config:
            pkgs.androidenv.composeAndroidPackages {
              # Keep API 21 images for the AVD and add API 33 for React Native builds.
              platformVersions = config.platformVersions;
              buildToolsVersions = [ config.buildToolsVersion ];
              cmdLineToolsVersion = config.cmdLineToolsVersion;
              includeEmulator = true;
              includeSystemImages = true;
              includeNDK = false;
              abiVersions = abiVersions;
              systemImageTypes = config.systemImageTypes;
            };
        in
        {
          android-sdk = (androidPkgs androidSdkConfig).androidsdk;
          android-sdk-min = (androidPkgs androidSdkConfigMin).androidsdk;
          android-sdk-max = (androidPkgs androidSdkConfigMax).androidsdk;
          default = (androidPkgs androidSdkConfig).androidsdk;
        }
      );

      androidSdkConfig = androidSdkConfig;
    };
}
