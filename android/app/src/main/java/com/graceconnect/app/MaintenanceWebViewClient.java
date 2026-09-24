package com.graceconnect.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Shows the bundled maintenance page instead of nginx "502 Bad Gateway" (or the
 * WebView's own "page not available") when the live site cannot be reached.
 *
 * Only main-frame network failures and 5xx responses are intercepted.
 * 404 / 401 / 403 must render the real page — Capacitor's errorPath would
 * otherwise replace them with maintenance.html.
 */
public class MaintenanceWebViewClient extends BridgeWebViewClient {

    static final String MAINTENANCE_PAGE = "maintenance.html";

    private final Bridge bridge;
    private String lastFailedUrl;
    private String lastReason = "maintenance";

    public MaintenanceWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    private String maintenanceUrl(String reason) {
        String base = bridge.getLocalUrl() + "/" + MAINTENANCE_PAGE;
        if ("offline".equals(reason)) return base + "?reason=offline";
        return base + "?reason=maintenance";
    }

    private boolean isMaintenanceUrl(String url) {
        return url != null && url.contains(MAINTENANCE_PAGE);
    }

    private boolean isNetworkAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) bridge.getContext()
                .getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Network network = cm.getActiveNetwork();
                if (network == null) return false;
                NetworkCapabilities caps = cm.getNetworkCapabilities(network);
                return caps != null && (
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
                );
            }
            android.net.NetworkInfo info = cm.getActiveNetworkInfo();
            return info != null && info.isConnected();
        } catch (Exception e) {
            return true;
        }
    }

    private boolean isOfflineError() {
        return !isNetworkAvailable();
    }

    private void showMaintenance(WebView view, WebResourceRequest request, String reason) {
        String failed = request.getUrl() != null ? request.getUrl().toString() : null;
        if (isMaintenanceUrl(failed)) return;
        lastFailedUrl = failed;
        lastReason = reason;
        view.post(() -> view.loadUrl(maintenanceUrl(reason)));
    }

    private boolean isClientHttpStatus(int status) {
        return status >= 400 && status < 500;
    }

    private boolean isMissingPageError(WebResourceError error) {
        if (error == null) return false;
        int code = error.getErrorCode();
        return code == WebViewClient.ERROR_FILE_NOT_FOUND
            || code == WebViewClient.ERROR_BAD_URL;
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (request.isForMainFrame() && isMissingPageError(error)) {
            return;
        }
        super.onReceivedError(view, request, error);
        if (request.isForMainFrame()) {
            showMaintenance(view, request, isOfflineError() ? "offline" : "maintenance");
        }
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
        int status = errorResponse != null ? errorResponse.getStatusCode() : 0;
        if (request.isForMainFrame() && isClientHttpStatus(status)) {
            return;
        }
        super.onReceivedHttpError(view, request, errorResponse);
        if (request.isForMainFrame() && status >= 500) {
            showMaintenance(view, request, isNetworkAvailable() ? "maintenance" : "offline");
        }
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        if (view.getContext() instanceof MainActivity) {
            ((MainActivity) view.getContext()).onWebViewReady();
        }
        if (isMaintenanceUrl(url)) {
            String reason = lastReason != null ? lastReason : "maintenance";
            view.evaluateJavascript("window.__GRACE_FAIL_REASON='" + reason + "';", null);
            if (lastFailedUrl != null) {
                String escaped = lastFailedUrl.replace("\\", "\\\\").replace("'", "\\'");
                view.evaluateJavascript("window.__GRACE_RETRY_URL='" + escaped + "';", null);
            }
        }
    }
}
