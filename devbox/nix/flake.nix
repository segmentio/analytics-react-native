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

          mkSdk = platformVersions:
            pkgs.androidenv.composeAndroidPackages {
              platformVersions = platformVersions;
              buildToolsVersions = [ "30.0.3" "33.0.0" "latest" ];
              cmdLineToolsVersion = "19.0";
              includeEmulator = true;
              includeSystemImages = true;
              includeNDK = true;
              abiVersions = [ "x86_64" "arm64-v8a" ];
              systemImageTypes = [ "google_apis" ];
            };

          sdkMin = mkSdk [ "21" ];
          sdkLatest = mkSdk [ "33" ];
          sdkFull = mkSdk [ "21" "33" ];
        in
        {
          android-sdk-min = sdkMin.androidsdk;
          android-sdk-latest = sdkLatest.androidsdk;
          android-sdk = sdkFull.androidsdk;
          default = sdkFull.androidsdk;
        });
    };
}
