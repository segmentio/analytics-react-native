{ lib
, stdenv
, fetchurl
}:

stdenv.mkDerivation rec {
  pname = "applesimutils";
  version = "0.9.12";

  src = fetchurl {
    url =
      if stdenv.hostPlatform.system == "aarch64-darwin" then
        "https://github.com/wix/AppleSimulatorUtils/releases/download/${version}/applesimutils-${version}.arm64_big_sur.bottle.tar.gz"
      else
        "https://github.com/wix/AppleSimulatorUtils/releases/download/${version}/applesimutils-${version}.big_sur.bottle.tar.gz";
    sha256 = "0cy1w8zcifdns0r95jf74qqkzmmmn079c8habf37f7h5lrgdhwrk";
  };

  dontBuild = true;

  installPhase = ''
    runHook preInstall
    mkdir -p $out/bin
    cp -v "0.9.12/bin/applesimutils" $out/bin/
    runHook postInstall
  '';

  meta = with lib; {
    description = "Apple Simulator Utils (applesimutils) command line tool";
    homepage = "https://github.com/wix/AppleSimulatorUtils";
    license = licenses.mit;
    platforms = platforms.darwin;
  };
}
