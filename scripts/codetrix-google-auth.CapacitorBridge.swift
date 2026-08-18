import Capacitor

extension GoogleAuth: CAPBridgedPlugin {
    public var identifier: String { "GoogleAuth" }
    public var jsName: String { "GoogleAuth" }
    public var pluginMethods: [CAPPluginMethod] {
        [
            CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "refresh", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "signOut", returnType: CAPPluginReturnPromise)
        ]
    }
}
