import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    private var screenRecordingShieldView: UIView?
    private var privacyBlurView: UIView?

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

        // Enable native iOS swipe-from-edge back/forward gesture on the WebView
        if let vc = self.window?.rootViewController as? CAPBridgeViewController {
            vc.webView?.allowsBackForwardNavigationGestures = true
        }
    }

    private func setupPrivacyProtection() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleScreenCaptureChanged),
            name: UIScreen.capturedDidChangeNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleUserDidTakeScreenshot),
            name: UIApplication.userDidTakeScreenshotNotification,
            object: nil
        )
        checkScreenCapture()
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
