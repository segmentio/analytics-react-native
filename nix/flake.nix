{
  description = "Slim Android SDK tools for Devbox via flakes";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      versionsFile = builtins.readFile ./scripts/platform-versions.sh;
      versionLines = builtins.splitString "\n" versionsFile;
      getVar = name: default:
        let
          line = builtins.findFirst (l: builtins.match ("^" + name + "=") l != null) "" versionLines;
          raw = if line == "" then default else builtins.elemAt (builtins.splitString "=" line) 1;
          cleaned = builtins.replaceStrings ["\"" "'"] [ "" "" ] raw;
        in cleaned;

      androidSdkConfig = {
        platformVersions = [
          (getVar "PLATFORM_ANDROID_MIN_API" "21")
          (getVar "PLATFORM_ANDROID_MAX_API" "33")
        ];
        buildToolsVersion = getVar "PLATFORM_ANDROID_BUILD_TOOLS_VERSION" "30.0.3";
        cmdLineToolsVersion = getVar "PLATFORM_ANDROID_CMDLINE_TOOLS_VERSION" "19.0";
        systemImageTypes = [ (getVar "PLATFORM_ANDROID_SYSTEM_IMAGE_TAG" "google_apis") ];
      };

      forAllSystems = f:
        builtins.listToAttrs (map (system: {
          name = system;
          value = f system;
        }) systems);
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = import nixpkgs {
            inherit system;
            config = {
              allowUnfree = true;
              android_sdk.accept_license = true;
            };
          };

          abiVersions =
            if builtins.match "aarch64-.*" system != null
            then [ "arm64-v8a" ]
            else [ "x86_64" ];

          androidPkgs = pkgs.androidenv.composeAndroidPackages {
            # Keep API 21 images for the AVD and add API 33 for React Native builds.
            platformVersions = androidSdkConfig.platformVersions;
            buildToolsVersions = [ androidSdkConfig.buildToolsVersion ];
            cmdLineToolsVersion = androidSdkConfig.cmdLineToolsVersion;
            includeEmulator = true;
            includeSystemImages = true;
            includeNDK = false;
            abiVersions = abiVersions;
            systemImageTypes = androidSdkConfig.systemImageTypes;
          };
        in
        {
          android-sdk = androidPkgs.androidsdk;
          default = androidPkgs.androidsdk;
        });

      androidSdkConfig = androidSdkConfig;
    };
}
