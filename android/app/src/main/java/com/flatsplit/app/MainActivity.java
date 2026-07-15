package com.flatsplit.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    private String pendingSharedImage = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if (type.startsWith("image/")) {
                Uri imageUri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (imageUri != null) {
                    processImageUri(imageUri, type);
                }
            }
        }
    }

    private void processImageUri(Uri uri, String mimeType) {
        try {
            InputStream inputStream = getContentResolver().openInputStream(uri);
            if (inputStream == null) return;
            
            java.io.File cacheDir = getCacheDir();
            java.io.File tempFile = new java.io.File(cacheDir, "shared_receipt_" + System.currentTimeMillis() + ".jpg");
            java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile);
            
            byte[] buffer = new byte[4096];
            int len;
            while ((len = inputStream.read(buffer)) != -1) {
                fos.write(buffer, 0, len);
            }
            fos.close();
            inputStream.close();
            
            pendingSharedImage = tempFile.getAbsolutePath();
            injectSharedImage();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void injectSharedImage() {
        if (pendingSharedImage != null && getBridge() != null && getBridge().getWebView() != null) {
            // Using an interval to ensure the JS runs only after the Hosted Web App URL has fully loaded and sessionStorage is accessible
            final String js = "var shareInterval = setInterval(function() { " +
                              "  try { " +
                              "    if (window.sessionStorage && window.location.href.indexOf('flatsplit.meals4heal.in') !== -1) { " +
                              "      sessionStorage.setItem('pendingSharedReceiptPath', '" + pendingSharedImage.replace("\\", "\\\\") + "'); " +
                              "      window.location.href = '/dashboard'; " +
                              "      clearInterval(shareInterval); " +
                              "    } " +
                              "  } catch(e) {} " +
                              "}, 200);";
            
            // Run on UI thread
            getBridge().getWebView().post(() -> {
                getBridge().getWebView().evaluateJavascript(js, null);
            });
            
            pendingSharedImage = null; // Clear it so it's not injected multiple times
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Just in case the bridge wasn't ready when handleIntent was called initially
        injectSharedImage();
    }
}
