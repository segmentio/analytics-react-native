// swift-tools-version: 6.0

import Foundation
import PackageDescription

let reactHeaders: [Target.Dependency] = [
    .product(name: "ReactHeaders", package: "ReactNative"),
    .product(name: "ReactNativeHeaders", package: "ReactNative"),
    .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
    .product(name: "ReactAppHeaders", package: "React-GeneratedCode"),
]

let usedRootEntries: Set<String> = ["ios", "spm-headers", "Package.swift"]
let unusedRootEntries = try! FileManager.default.contentsOfDirectory(atPath: Context.packageDirectory)
    .filter { !usedRootEntries.contains($0) }
    .sorted()

let package = Package(
    name: "sovran_react_native",
    platforms: [.iOS("15.1")],
    products: [
        .library(name: "sovran_react_native", targets: ["sovran_react_native", "SovranObjC"]),
    ],
    dependencies: [
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        .package(name: "React-GeneratedCode", path: "../../../ios"),
    ],
    targets: [
        .target(
            name: "sovran_react_native",
            dependencies: reactHeaders,
            path: "ios",
            exclude: ["Sovran.m", "Sovran-Bridging-Header.h", "Sovran.xcodeproj"],
            sources: ["Sovran.swift"]
        ),
        .target(
            name: "SovranObjC",
            dependencies: [.target(name: "sovran_react_native")] + reactHeaders,
            path: ".",
            exclude: unusedRootEntries + ["ios/Sovran.swift", "ios/Sovran-Bridging-Header.h", "ios/Sovran.xcodeproj"],
            sources: ["ios/Sovran.m"],
            publicHeadersPath: "spm-headers/public",
            cSettings: [.define("RCT_NEW_ARCH_ENABLED", to: "1")],
            cxxSettings: [.define("RCT_NEW_ARCH_ENABLED", to: "1")]
        ),
    ],
    swiftLanguageModes: [.v5]
)
