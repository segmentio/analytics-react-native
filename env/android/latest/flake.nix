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

          sdk = pkgs.androidenv.composeAndroidPackages {
            platformVersions = [ "33" ];
            buildToolsVersions = [ "33.0.0" ];
            cmdLineToolsVersion = "19.0";
            includeEmulator = true;
            includeSystemImages = true;
            includeNDK = true;
            abiVersions = [ "x86_64" ];
            systemImageTypes = [ "google_apis" ];
          };
        in
        {
          android-sdk-latest = sdk.androidsdk;
          default = sdk.androidsdk;
        });
    };
}
