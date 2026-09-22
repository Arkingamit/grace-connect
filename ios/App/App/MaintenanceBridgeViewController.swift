import UIKit
import WebKit
import Capacitor
import Network

/// Forwards WKNavigationDelegate calls to Capacitor, but intercepts main-frame
/// HTTP 5xx (nginx 502/503/504) and network failures and shows the bundled
/// maintenance / offline page.
///
/// Capacitor's own `server.errorPath` already covers some network failures
/// (`didFailProvisionalNavigation`). WKWebView treats a 502 HTML body as a
/// successful load, so we cancel that response ourselves. We also classify
/// NSURLError offline codes so the page can say "connect to the internet".
final class MaintenanceNavigationProxy: NSObject, WKNavigationDelegate {
    weak var capacitor: NSObject?
    var lastFailedURL: String?
    var lastReason: String = "maintenance"
    var networkSatisfied = true

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
            lastReason = networkSatisfied ? "maintenance" : "offline"
            decisionHandler(.cancel)
            loadMaintenance(in: webView)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if handleLoadFailure(in: webView, error: error) { return }
        (capacitor as? WKNavigationDelegate)?.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if handleLoadFailure(in: webView, error: error) { return }
        (capacitor as? WKNavigationDelegate)?.webView?(webView, didFail: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if webView.url?.absoluteString.contains("maintenance.html") == true {
            let reason = lastReason
            webView.evaluateJavaScript("window.__GRACE_FAIL_REASON='\(reason)';", completionHandler: nil)
            if let failed = lastFailedURL {
                let escaped = failed
                    .replacingOccurrences(of: "\\", with: "\\\\")
                    .replacingOccurrences(of: "'", with: "\\'")
                webView.evaluateJavaScript("window.__GRACE_RETRY_URL='\(escaped)';", completionHandler: nil)
            }
        }
        (capacitor as? WKNavigationDelegate)?.webView?(webView, didFinish: navigation)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        lastReason = "maintenance"
        lastFailedURL = webView.url?.absoluteString
        loadMaintenance(in: webView)
    }

    private func handleLoadFailure(in webView: WKWebView, error: Error) -> Bool {
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled { return false }
        if nsError.domain == "WebKitErrorDomain" && nsError.code == 102 { return false }
        if webView.url?.absoluteString.contains("maintenance.html") == true { return true }

        lastFailedURL = (nsError.userInfo[NSURLErrorFailingURLStringErrorKey] as? String)
            ?? webView.url?.absoluteString
        lastReason = isOfflineError(nsError) || !networkSatisfied ? "offline" : "maintenance"
        loadMaintenance(in: webView)
        return true
    }

    private func isOfflineError(_ error: NSError) -> Bool {
        guard error.domain == NSURLErrorDomain else { return !networkSatisfied }
        switch error.code {
        case NSURLErrorNotConnectedToInternet,
             NSURLErrorNetworkConnectionLost,
             NSURLErrorInternationalRoamingOff,
             NSURLErrorDataNotAllowed:
            return true
        default:
            return !networkSatisfied
        }
    }

    private func loadMaintenance(in webView: WKWebView) {
        let reason = lastReason
        if let vc = webView.window?.rootViewController as? CAPBridgeViewController,
           let errorURL = vc.bridge?.config.errorPathURL {
            var components = URLComponents(url: errorURL, resolvingAgainstBaseURL: false)
            var items = components?.queryItems ?? []
            items.removeAll { $0.name == "reason" }
            items.append(URLQueryItem(name: "reason", value: reason))
            components?.queryItems = items
            if let url = components?.url {
                webView.load(URLRequest(url: url))
                return
            }
            webView.load(URLRequest(url: errorURL))
            return
        }
        if let url = URL(string: "capacitor://localhost/maintenance.html?reason=\(reason)") {
            webView.load(URLRequest(url: url))
        }
    }
}

class MaintenanceBridgeViewController: CAPBridgeViewController {
    private let proxy = MaintenanceNavigationProxy()
    private let networkMonitor = NWPathMonitor()

    override func viewDidLoad() {
        super.viewDidLoad()
        networkMonitor.pathUpdateHandler = { [weak self] path in
            self?.proxy.networkSatisfied = path.status == .satisfied
        }
        networkMonitor.start(queue: DispatchQueue.global(qos: .utility))
    }

    deinit {
        networkMonitor.cancel()
    }

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
