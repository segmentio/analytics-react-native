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
          };

          androidPkgs = pkgs.androidenv.composeAndroidPackages {
            licenseAccepted = true;
            numLatestPlatformVersions = 1;
            includeEmulator = "yes";
            includeSystemImages = "yes";
            includeNDK = "yes";
          };
        in
        {
          android-sdk = androidPkgs.androidsdk;
        });
    };
}
