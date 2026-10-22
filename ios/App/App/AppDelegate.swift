import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    private var screenRecordingShieldView: UIView?
    private var privacyBlurView: UIView?

    // ── Secure screenshot prevention ──────────────────────────────────
    // A hidden UITextField with isSecureTextEntry = true causes iOS to
    // black-out any content rendered inside its layer during screenshots
    // and screen recordings.  We reparent the entire view hierarchy into
    // this secure container so the whole app is protected.
    private var secureField: UITextField?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        FirebaseApp.configure()
        application.registerForRemoteNotifications()
        setupPrivacyProtection()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Obscure app content so App Switcher snapshot is blank/blurred
        showPrivacyBlur()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Remove app switcher privacy shield and verify screen capture status
        hidePrivacyBlur()
        checkScreenCapture()
        enableSecureScreenshotPrevention()

        // Enable native iOS swipe-from-edge back/forward gesture on the WebView
        if let vc = self.window?.rootViewController as? CAPBridgeViewController {
            vc.webView?.allowsBackForwardNavigationGestures = true
        }
    }

    private func setupPrivacyProtection() {
        // 1. Apply the secure text field technique to prevent screenshots
        enableSecureScreenshotPrevention()

        // 2. Observe screen capture (mirroring / recording) changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleScreenCaptureChanged),
            name: UIScreen.capturedDidChangeNotification,
            object: nil
        )
        // 3. Observe post-screenshot notification (for toast / clipboard wipe)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleUserDidTakeScreenshot),
            name: UIApplication.userDidTakeScreenshotNotification,
            object: nil
        )
        checkScreenCapture()
    }

    // MARK: – Secure screenshot prevention (iOS 15, 16, 17, 18+)

    /// Applies the native CoreAnimation secure layer hierarchy trick.
    /// A hidden UITextField with isSecureTextEntry = true generates an internal
    /// hardware-encrypted canvas layer (_UITextLayoutCanvasView).
    /// By nesting the rootViewController's view layer inside this secure layer:
    /// 1. The entire screen content is captured as PURE BLACK during screenshots and recordings.
    /// 2. The UIView hierarchy and touch hit-testing are 100% untouched, ensuring full interactivity.
    @objc func enableSecureScreenshotPrevention() {
        guard secureField == nil else { return }

        guard let window = self.window ?? UIApplication.shared.windows.first(where: \.isKeyWindow) else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                self?.enableSecureScreenshotPrevention()
            }
            return
        }

        guard let targetView = window.rootViewController?.view ?? window.subviews.first else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                self?.enableSecureScreenshotPrevention()
            }
            return
        }

        guard let parentLayer = targetView.layer.superlayer else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                self?.enableSecureScreenshotPrevention()
            }
            return
        }

        let field = UITextField()
        field.isSecureTextEntry = true
        field.isUserInteractionEnabled = false
        field.frame = targetView.bounds
        field.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        targetView.addSubview(field)
        targetView.sendSubviewToBack(field)

        // Force UIKit layout pass so internal secure canvas sublayers are materialized immediately
        field.setNeedsLayout()
        field.layoutIfNeeded()

        parentLayer.addSublayer(field.layer)

        // In iOS 17+, the secure text canvas moved to sublayers?.last.
        // In iOS 16 and below, it was sublayers?.first.
        let secureSublayer: CALayer?
        if #available(iOS 17.0, *) {
            secureSublayer = field.layer.sublayers?.last ?? field.layer.sublayers?.first
        } else {
            secureSublayer = field.layer.sublayers?.first ?? field.layer.sublayers?.last
        }

        guard let secureLayer = secureSublayer else {
            field.removeFromSuperview()
            field.layer.removeFromSuperlayer()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
                self?.enableSecureScreenshotPrevention()
            }
            return
        }

        secureLayer.addSublayer(targetView.layer)
        secureField = field
    }

    @objc private func handleScreenCaptureChanged() {
        DispatchQueue.main.async { [weak self] in
            self?.checkScreenCapture()
        }
    }

    @objc private func handleUserDidTakeScreenshot() {
        if let vc = self.window?.rootViewController as? CAPBridgeViewController {
            vc.webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('app:screenshot-attempt'));", completionHandler: nil)
        }
    }

    private func checkScreenCapture() {
        let isCaptured = UIScreen.screens.contains { $0.isCaptured }
        if isCaptured {
            showScreenRecordingShield()
        } else {
            hideScreenRecordingShield()
        }
    }

    private func showScreenRecordingShield() {
        guard let window = self.window, screenRecordingShieldView == nil else { return }

        let shield = UIView(frame: window.bounds)
        shield.backgroundColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1.0)
        shield.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "Screen Recording Detected"
        titleLabel.textColor = .white
        titleLabel.font = UIFont.systemFont(ofSize: 20, weight: .bold)
        titleLabel.textAlignment = .center

        let messageLabel = UILabel()
        messageLabel.text = "For security and privacy, content cannot be recorded or mirrored."
        messageLabel.textColor = UIColor(white: 0.8, alpha: 1.0)
        messageLabel.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0

        stack.addArrangedSubview(titleLabel)
        stack.addArrangedSubview(messageLabel)
        shield.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerYAnchor.constraint(equalTo: shield.centerYAnchor),
            stack.leadingAnchor.constraint(equalTo: shield.leadingAnchor, constant: 32),
            stack.trailingAnchor.constraint(equalTo: shield.trailingAnchor, constant: -32)
        ])

        window.addSubview(shield)
        screenRecordingShieldView = shield
    }

    private func hideScreenRecordingShield() {
        screenRecordingShieldView?.removeFromSuperview()
        screenRecordingShieldView = nil
    }

    private func showPrivacyBlur() {
        guard let window = self.window, privacyBlurView == nil else { return }
        let blurEffect = UIBlurEffect(style: .dark)
        let blurView = UIVisualEffectView(effect: blurEffect)
        blurView.frame = window.bounds
        blurView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window.addSubview(blurView)
        privacyBlurView = blurView
    }

    private func hidePrivacyBlur() {
        privacyBlurView?.removeFromSuperview()
        privacyBlurView = nil
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}
