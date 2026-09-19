package com.graceconnect.app;

import android.os.Handler;
import android.os.Looper;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;

import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private volatile boolean hideNativeSplash = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !hideNativeSplash);
        new Handler(Looper.getMainLooper()).postDelayed(() -> hideNativeSplash = true, 2500);

        // Credential Manager Google (Grace Music strategy) + Codetrix for iOS parity if present.
        registerPlugin(GraceGoogleAuthPlugin.class);
        registerPlugin(GraceMediaPlugin.class);
        registerPlugin(GoogleAuth.class);
        super.onCreate(savedInstanceState);

        // Android 15+ edge-to-edge ignores adjustResize unless decor fits system windows.
        // Without this, the keyboard overlays the WebView and leaves gray gaps in dialogs.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        Runnable enableAutofill = () -> {
            if (getBridge() == null) return;
            WebView webView = getBridge().getWebView();
            if (webView != null && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                webView.setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_YES);
            }
        };
        enableAutofill.run();
        new Handler(Looper.getMainLooper()).post(enableAutofill);

        // Replace nginx 502 / "page not available" with the bundled maintenance page.
        if (getBridge() != null) {
            getBridge().setWebViewClient(new MaintenanceWebViewClient(getBridge()));
        }

        registerNativeBackInterceptor();
    }

    void onWebViewReady() {
        hideNativeSplash = true;
    }

    /**
     * Fallback when JS has not loaded yet (remote Next.js URL).
     * Prefer window.__graceNativeBack(); else WebView history; else minimize.
     */
    private void registerNativeBackInterceptor() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    moveTaskToBack(true);
                    return;
                }

                webView.evaluateJavascript(
                    "(function(){try{if(typeof window.__graceNativeBack==='function'){return window.__graceNativeBack();}return null;}catch(e){return null;}})()",
                    value -> {
                        String result = value == null ? "null" : value.replace("\"", "").trim();
                        if ("true".equalsIgnoreCase(result) || "1".equals(result)) {
                            return;
                        }
                        if (webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            moveTaskToBack(true);
                        }
                    }
                );
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }
}
