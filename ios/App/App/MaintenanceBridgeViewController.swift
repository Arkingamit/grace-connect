import UIKit
import WebKit
import Capacitor

/// Forwards WKNavigationDelegate calls to Capacitor, but intercepts main-frame
/// HTTP 5xx (nginx 502/503/504) and shows the bundled maintenance page.
///
/// Capacitor's own `server.errorPath` already covers network failures
/// (`didFailProvisionalNavigation`). WKWebView treats a 502 HTML body as a
/// successful load, so we have to cancel that response ourselves.
final class MaintenanceNavigationProxy: NSObject, WKNavigationDelegate {
    weak var capacitor: NSObject?
    var lastFailedURL: String?

    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector) || (capacitor?.responds(to: aSelector) ?? false)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        if capacitor?.responds(to: aSelector) == true {
            return capacitor
        }
        return super.forwardingTarget(for: aSelector)
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationResponse: WKNavigationResponse,
        decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
    ) {
        if navigationResponse.isForMainFrame,
           let http = navigationResponse.response as? HTTPURLResponse,
           http.statusCode >= 500,
           let url = http.url,
           !url.absoluteString.contains("maintenance.html") {
            lastFailedURL = url.absoluteString
            decisionHandler(.cancel)
            loadMaintenance(in: webView)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if webView.url?.absoluteString.contains("maintenance.html") == true,
           let failed = lastFailedURL {
            let escaped = failed
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "'", with: "\\'")
            webView.evaluateJavaScript("window.__GRACE_RETRY_URL='\(escaped)';", completionHandler: nil)
        }
        (capacitor as? WKNavigationDelegate)?.webView?(webView, didFinish: navigation)
    }

    private func loadMaintenance(in webView: WKWebView) {
        if let vc = webView.window?.rootViewController as? CAPBridgeViewController,
           let errorURL = vc.bridge?.config.errorPathURL {
            webView.load(URLRequest(url: errorURL))
            return
        }
        if let url = URL(string: "capacitor://localhost/maintenance.html") {
            webView.load(URLRequest(url: url))
        }
    }
}

class MaintenanceBridgeViewController: CAPBridgeViewController {
    private let proxy = MaintenanceNavigationProxy()

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        installProxyIfNeeded()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        installProxyIfNeeded()
    }

    private func installProxyIfNeeded() {
        guard let webView = webView, webView.navigationDelegate !== proxy else { return }
        proxy.capacitor = webView.navigationDelegate as? NSObject
        webView.navigationDelegate = proxy
    }
}
