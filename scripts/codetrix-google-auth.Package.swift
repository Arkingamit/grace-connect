// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CodetrixStudioCapacitorGoogleAuth",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CodetrixStudioCapacitorGoogleAuth",
            targets: ["GoogleAuthPlugin"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", exact: "6.2.4")
    ],
    targets: [
        .target(
            name: "GoogleAuthPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
            ],
            path: "ios/Plugin",
            // SwiftPM rejects mixed-language targets, so the Objective-C
            // registration macro is replaced by CAPBridgedPlugin in Swift.
            exclude: ["Info.plist", "Plugin.h", "Plugin.m"]
        )
    ]
)
