// swift-tools-version: 6.0

import Foundation
import PackageDescription

let reactHeaders: [Target.Dependency] = [
    .product(name: "ReactHeaders", package: "ReactNative"),
    .product(name: "ReactNativeHeaders", package: "ReactNative"),
    .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
    .product(name: "ReactAppHeaders", package: "React-GeneratedCode"),
]

let usedRootEntries: Set<String> = ["ios", "spm-support", "spm-headers", "Package.swift"]
let unusedRootEntries = try! FileManager.default.contentsOfDirectory(atPath: Context.packageDirectory)
    .filter { !usedRootEntries.contains($0) }
    .sorted()

let package = Package(
    name: "segment_analytics_react_native",
    platforms: [.iOS("15.1")],
    products: [
        .library(name: "segment_analytics_react_native", targets: ["segment_analytics_react_native", "SegmentAnalyticsObjC"]),
    ],
    dependencies: [
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        .package(name: "React-GeneratedCode", path: "../../../ios"),
        .package(name: "sovran_react_native", path: "../sovran_react_native"),
    ],
    targets: [
        .target(
            name: "segment_analytics_react_native",
            dependencies: [.product(name: "sovran_react_native", package: "sovran_react_native")] + reactHeaders,
            path: ".",
            exclude: unusedRootEntries + [
                "spm-headers",
                "ios/AnalyticsReactNative.m",
                "ios/AnalyticsReactNative-Bridging-Header.h",
                "ios/AnalyticsReactNative.xcodeproj",
            ],
            sources: ["ios/AnalyticsReactNative.swift", "spm-support"],
            resources: [.process("ios/PrivacyInfo.xcprivacy")]
        ),
        .target(
            name: "SegmentAnalyticsObjC",
            dependencies: [.target(name: "segment_analytics_react_native")] + reactHeaders,
            path: ".",
            exclude: unusedRootEntries + [
                "spm-support",
                "ios/AnalyticsReactNative.swift",
                "ios/AnalyticsReactNative-Bridging-Header.h",
                "ios/AnalyticsReactNative.xcodeproj",
                "ios/PrivacyInfo.xcprivacy",
            ],
            sources: ["ios/AnalyticsReactNative.m"],
            publicHeadersPath: "spm-headers/public",
            cSettings: [.define("RCT_NEW_ARCH_ENABLED", to: "1")],
            cxxSettings: [.define("RCT_NEW_ARCH_ENABLED", to: "1")]
        ),
    ],
    swiftLanguageModes: [.v5]
)
