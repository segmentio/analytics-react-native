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

          androidPkgs = pkgs.androidenv.composeAndroidPackages {
            # Keep API 21 images for the AVD and add API 33 for React Native builds.
            platformVersions = [ "21" "33" ];
            buildToolsVersions = [ "30.0.3" "33.0.0" "latest" ];
            cmdLineToolsVersion = "19.0";
            includeEmulator = true;
            includeSystemImages = true;
            includeNDK = true;
          };
        in
        {
          android-sdk = androidPkgs.androidsdk;
          default = androidPkgs.androidsdk;
        });
    };
}
