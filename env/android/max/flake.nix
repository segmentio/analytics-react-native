{
  description = "Android SDK (API 33) for flox";

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

          abiVersions =
            if builtins.match "aarch64-.*" system != null
            then [ "arm64-v8a" ]
            else [ "x86_64" ];

          sdk = pkgs.androidenv.composeAndroidPackages {
            platformVersions = [ "33" ];
            buildToolsVersions = [ "30.0.3" ];
            cmdLineToolsVersion = "19.0";
            includeEmulator = true;
            includeSystemImages = true;
            includeNDK = true;
            abiVersions = abiVersions;
            systemImageTypes = [ "google_apis" ];
          };
        in
        {
          android-sdk-max = sdk.androidsdk;
          default = sdk.androidsdk;
        });
    };
}
