package com.graceconnect.app;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import org.json.JSONObject;

/**
 * Android Google ID-token sign-in via Credential Manager (same strategy as Grace Music).
 * Avoids Codetrix GoogleAuth's older Sign-In SDK path that often fails with error 10 /
 * cancel-after-account-pick inside the remote WebView shell.
 */
@CapacitorPlugin(name = "GraceGoogleAuth")
public class GraceGoogleAuthPlugin extends Plugin {

    private static final String TAG = "GraceGoogleAuth";

    /** Web OAuth client ID — must match requestIdToken / server audience. */
    private static final String WEB_CLIENT_ID =
        "641349616597-i769rj34s7j08odnfurq27quo5f0jv7k.apps.googleusercontent.com";

    @PluginMethod
    public void signIn(PluginCall call) {
        trySignIn(call, false);
    }

    private void trySignIn(PluginCall call, boolean useButtonFlow) {
        GetCredentialRequest request;
        if (useButtonFlow) {
            GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(WEB_CLIENT_ID)
                .setNonce(randomNonce())
                .build();
            request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
        } else {
            GetGoogleIdOption option = new GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(WEB_CLIENT_ID)
                .setAutoSelectEnabled(false)
                .setNonce(randomNonce())
                .build();
            request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
        }

        CredentialManager credentialManager = CredentialManager.create(getContext());
        credentialManager.getCredentialAsync(
            getActivity(),
            request,
            null,
            Runnable::run,
            new androidx.credentials.CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(@NonNull GetCredentialResponse response) {
                    handleSuccess(call, response);
                }

                @Override
                public void onError(@NonNull GetCredentialException e) {
                    Log.e(TAG, "getCredential failed flow=" + (useButtonFlow ? "button" : "googleId"), e);
                    if (!useButtonFlow && (e instanceof NoCredentialException || e instanceof GetCredentialCancellationException)) {
                        new Handler(Looper.getMainLooper()).post(() -> trySignIn(call, true));
                        return;
                    }
                    String sha1 = signingSha1();
                    if (e instanceof GetCredentialCancellationException) {
                        Log.i(TAG, "Google Sign-In canceled by user (APK SHA-1: " + sha1 + ")");
                        call.reject("canceled", "SIGN_IN_CANCELED");
                        return;
                    }
                    String detail = e.getClass().getSimpleName();
                    if (e.getMessage() != null && !e.getMessage().isEmpty()) {
                        detail += ": " + e.getMessage();
                    }
                    detail += " (APK SHA-1: " + sha1 + ")";
                    call.reject(detail);
                }
            }
        );
    }

    private void handleSuccess(PluginCall call, GetCredentialResponse response) {
        try {
            Credential credential = response.getCredential();
            if (!(credential instanceof CustomCredential)) {
                call.reject("Unexpected credential type");
                return;
            }
            CustomCredential custom = (CustomCredential) credential;
            if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(custom.getType())) {
                call.reject("Unexpected Google credential type");
                return;
            }

            GoogleIdTokenCredential googleCredential = GoogleIdTokenCredential.createFrom(custom.getData());
            String idToken = googleCredential.getIdToken();
            if (idToken == null || idToken.isEmpty()) {
                call.reject("Google did not return an ID token");
                return;
            }

            JSObject result = new JSObject();
            result.put("idToken", idToken);
            result.put("email", googleCredential.getId());
            result.put("displayName", googleCredential.getDisplayName());
            result.put("givenName", googleCredential.getGivenName());
            result.put("familyName", googleCredential.getFamilyName());
            if (googleCredential.getProfilePictureUri() != null) {
                result.put("imageUrl", googleCredential.getProfilePictureUri().toString());
            }

            try {
                String[] parts = idToken.split("\\.");
                if (parts.length >= 2) {
                    byte[] decoded = Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
                    JSONObject payload = new JSONObject(new String(decoded, StandardCharsets.UTF_8));
                    if (payload.has("sub")) result.put("sub", payload.getString("sub"));
                    if (payload.has("email")) result.put("email", payload.getString("email"));
                    if (payload.has("name")) result.put("name", payload.getString("name"));
                }
            } catch (Exception ignored) {
                // optional claims
            }

            call.resolve(result);
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "Failed to parse Google credential");
        }
    }

    private String signingSha1() {
        try {
            PackageManager pm = getContext().getPackageManager();
            String pkg = getContext().getPackageName();
            Signature[] signatures;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo info = pm.getPackageInfo(pkg, PackageManager.GET_SIGNING_CERTIFICATES);
                signatures = info.signingInfo != null ? info.signingInfo.getApkContentsSigners() : null;
            } else {
                @SuppressWarnings("deprecation")
                PackageInfo info = pm.getPackageInfo(pkg, PackageManager.GET_SIGNATURES);
                signatures = info.signatures;
            }
            if (signatures == null || signatures.length == 0) {
                return "unknown";
            }
            byte[] digest = MessageDigest.getInstance("SHA-1").digest(signatures[0].toByteArray());
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < digest.length; i++) {
                if (i > 0) sb.append(':');
                sb.append(String.format("%02X", digest[i]));
            }
            return sb.toString();
        } catch (Exception e) {
            Log.e(TAG, "Could not read signing SHA-1", e);
            return "unknown";
        }
    }

    private static String randomNonce() {
        byte[] bytes = new byte[16];
        new SecureRandom().nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
