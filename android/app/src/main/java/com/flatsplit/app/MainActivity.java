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
            
            ByteArrayOutputStream byteBuffer = new ByteArrayOutputStream();
            int bufferSize = 4096;
            byte[] buffer = new byte[bufferSize];
            int len;
            while ((len = inputStream.read(buffer)) != -1) {
                byteBuffer.write(buffer, 0, len);
            }
            byte[] imageBytes = byteBuffer.toByteArray();
            String base64 = Base64.encodeToString(imageBytes, Base64.NO_WRAP);
            
            pendingSharedImage = "data:" + mimeType + ";base64," + base64;
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
                              "    if (window.sessionStorage) { " +
                              "      sessionStorage.setItem('pendingSharedReceipt', '" + pendingSharedImage + "'); " +
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
