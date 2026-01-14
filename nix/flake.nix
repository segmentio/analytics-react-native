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
            platformVersions = ["21"];
            includeEmulator = true;
            includeSystemImages = true;
            includeNDK = true;
          };
        in
        {
          android-sdk = androidPkgs.androidsdk;
        });
    };
}
