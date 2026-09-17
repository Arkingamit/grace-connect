package com.graceconnect.app;

import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Shows the bundled maintenance page instead of nginx "502 Bad Gateway" (or the
 * WebView's own "page not available") when the live site cannot be reached.
 *
 * Only main-frame network failures and 5xx responses are intercepted, so normal
 * Next.js 404 / 401 pages keep rendering as-is.
 */
public class MaintenanceWebViewClient extends BridgeWebViewClient {

    static final String MAINTENANCE_PAGE = "maintenance.html";

    private final Bridge bridge;
    private String lastFailedUrl;

    public MaintenanceWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    private String maintenanceUrl() {
        return bridge.getLocalUrl() + "/" + MAINTENANCE_PAGE;
    }

    private boolean isMaintenanceUrl(String url) {
        return url != null && url.contains(MAINTENANCE_PAGE);
    }

    private void showMaintenance(WebView view, WebResourceRequest request) {
        String failed = request.getUrl() != null ? request.getUrl().toString() : null;
        if (isMaintenanceUrl(failed)) return;
        lastFailedUrl = failed;
        view.loadUrl(maintenanceUrl());
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        super.onReceivedError(view, request, error);
        if (request.isForMainFrame()) {
            showMaintenance(view, request);
        }
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
        super.onReceivedHttpError(view, request, errorResponse);
        if (request.isForMainFrame() && errorResponse != null && errorResponse.getStatusCode() >= 500) {
            showMaintenance(view, request);
        }
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        if (isMaintenanceUrl(url) && lastFailedUrl != null) {
            // Let the page return the user to where they were once the site is back.
            String escaped = lastFailedUrl.replace("\\", "\\\\").replace("'", "\\'");
            view.evaluateJavascript("window.__GRACE_RETRY_URL='" + escaped + "';", null);
        }
    }
}
