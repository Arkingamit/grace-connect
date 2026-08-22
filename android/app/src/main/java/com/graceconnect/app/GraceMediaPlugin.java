package com.graceconnect.app;

import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.List;

/**
 * Saves a PNG or PDF onto the device, then shows the system "Open with" sheet
 * so the member can preview it in Gallery, Photos, or a PDF viewer.
 */
@CapacitorPlugin(name = "GraceMedia")
public class GraceMediaPlugin extends Plugin {

    @PluginMethod
    public void savePng(PluginCall call) {
        saveAndOpen(call);
    }

    @PluginMethod
    public void saveAndOpen(PluginCall call) {
        String data = call.getString("data");
        String mimeType = normalizeMime(call.getString("mimeType"));
        String filename = sanitizeFilename(call.getString("filename"), mimeType);

        if (data == null || data.isEmpty()) {
            call.reject("File data is required");
            return;
        }

        int comma = data.indexOf(',');
        if (data.startsWith("data:") && comma > 0) {
            data = data.substring(comma + 1);
        }

        final byte[] bytes;
        try {
            bytes = Base64.decode(data, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Could not read the file data");
            return;
        }

        if (bytes == null || bytes.length == 0) {
            call.reject("File data is empty");
            return;
        }

        try {
            Uri uri = insertFile(filename, mimeType, bytes);
            openWithChooser(uri, mimeType);
            JSObject result = new JSObject();
            result.put("uri", uri != null ? uri.toString() : "");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not save the file.");
        }
    }

    private void openWithChooser(Uri uri, String mimeType) {
        if (uri == null) return;

        Intent view = new Intent(Intent.ACTION_VIEW);
        view.setDataAndType(uri, mimeType);
        view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        Intent chooser = Intent.createChooser(view, "Open with");
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        chooser.setClipData(ClipData.newRawUri("", uri));

        List<ResolveInfo> targets = getContext().getPackageManager()
            .queryIntentActivities(view, PackageManager.MATCH_DEFAULT_ONLY);
        for (ResolveInfo info : targets) {
            getContext().grantUriPermission(
                info.activityInfo.packageName,
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
        }

        getActivity().startActivity(chooser);
    }

    private Uri insertFile(String filename, String mimeType, byte[] bytes) throws Exception {
        boolean isPdf = "application/pdf".equals(mimeType);
        ContentResolver resolver = getContext().getContentResolver();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);

            Uri collection;
            if (isPdf) {
                values.put(
                    MediaStore.MediaColumns.RELATIVE_PATH,
                    Environment.DIRECTORY_DOWNLOADS + "/Grace Connect"
                );
                collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            } else {
                values.put(
                    MediaStore.MediaColumns.RELATIVE_PATH,
                    Environment.DIRECTORY_PICTURES + "/Grace Connect"
                );
                collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            }

            Uri uri = resolver.insert(collection, values);
            if (uri == null) {
                throw new IllegalStateException("MediaStore insert failed");
            }

            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) {
                    throw new IllegalStateException("Could not open saved file");
                }
                out.write(bytes);
            }

            values.clear();
            values.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(uri, values, null, null);
            return uri;
        }

        File root = Environment.getExternalStoragePublicDirectory(
            isPdf ? Environment.DIRECTORY_DOWNLOADS : Environment.DIRECTORY_PICTURES
        );
        File folder = new File(root, "Grace Connect");
        if (!folder.exists() && !folder.mkdirs()) {
            throw new IllegalStateException("Could not create save folder");
        }

        File file = new File(folder, filename);
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(bytes);
        }

        if (!isPdf) {
            Intent scan = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
            scan.setData(Uri.fromFile(file));
            getContext().sendBroadcast(scan);
        }

        return FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            file
        );
    }

    private static String normalizeMime(String mimeType) {
        if (mimeType == null || mimeType.isEmpty()) return "image/png";
        return mimeType;
    }

    private static String sanitizeFilename(String value, String mimeType) {
        String name = value == null ? "" : value.replaceAll("[^a-zA-Z0-9._-]+", "-");
        name = name.replaceAll("^-+|-+$", "");
        boolean pdf = "application/pdf".equals(mimeType);
        if (name.isEmpty()) name = pdf ? "export.pdf" : "campus-qr-code.png";
        if (pdf && !name.toLowerCase().endsWith(".pdf")) name = name + ".pdf";
        if (!pdf && !name.toLowerCase().endsWith(".png")) name = name + ".png";
        return name;
    }
}
