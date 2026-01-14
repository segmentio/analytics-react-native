{ pkgs ? import <nixpkgs> { } }:

let
  androidPkgs = pkgs.androidenv.composeAndroidPackages {
    licenseAccepted = true;
    numLatestPlatformVersions = 1;
    includeEmulator = "yes";
    includeSystemImages = "yes";
    includeNDK = "yes";
  };
in
androidPkgs.androidsdk
