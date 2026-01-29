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

      versionData = builtins.fromJSON (builtins.readFile ./defaults.json);
      defaultsData = if builtins.hasAttr "defaults" versionData then versionData.defaults else versionData;
      getVar =
        name:
        if builtins.hasAttr name defaultsData then toString (builtins.getAttr name defaultsData)
        else builtins.throw "Missing required default in nix/defaults.json: ${name}";

      unique =
        list:
        builtins.foldl' (
          acc: item: if builtins.elem item acc then acc else acc ++ [ item ]
        ) [ ] list;

      androidSdkConfig = {
        platformVersions = unique [
          (getVar "ANDROID_MIN_API")
          (getVar "ANDROID_MAX_API")
          (getVar "ANDROID_CUSTOM_API")
        ];
        buildToolsVersion = getVar "ANDROID_BUILD_TOOLS_VERSION";
        cmdLineToolsVersion = getVar "ANDROID_CMDLINE_TOOLS_VERSION";
        systemImageTypes = [ (getVar "ANDROID_SYSTEM_IMAGE_TAG") ];
      };
      androidSdkConfigMin = androidSdkConfig // {
        platformVersions = unique [
          (getVar "ANDROID_MIN_API")
          (getVar "ANDROID_MAX_API")
        ];
      };
      androidSdkConfigMax = androidSdkConfig // {
        platformVersions = [ (getVar "ANDROID_MAX_API") ];
      };
      androidSdkConfigCustom = androidSdkConfig // {
        platformVersions = [ (getVar "ANDROID_CUSTOM_API") ];
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

          applesimutils = pkgs.callPackage ./applesimutils.nix { };

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
          applesimutils = applesimutils;
          android-sdk = (androidPkgs androidSdkConfig).androidsdk;
          android-sdk-min = (androidPkgs androidSdkConfigMin).androidsdk;
          android-sdk-max = (androidPkgs androidSdkConfigMax).androidsdk;
          android-sdk-custom = (androidPkgs androidSdkConfigCustom).androidsdk;
          default = (androidPkgs androidSdkConfig).androidsdk;
        }
      );

      androidSdkConfig = androidSdkConfig;
    };
}
