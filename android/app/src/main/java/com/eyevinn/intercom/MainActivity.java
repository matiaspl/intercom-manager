package com.eyevinn.intercom;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import android.content.Intent;
import android.os.Build;

    public class MainActivity extends BridgeActivity {
        @Override
        public void onCreate(Bundle savedInstanceState) {
        // Register in-app Capacitor plugins BEFORE bridge init
        try {
            Log.i("Intercom", "Registering native plugins");
            registerPlugin(OverlayBubblePlugin.class);
            registerPlugin(AudioRoutePlugin.class);
            registerPlugin(CallServicePlugin.class);
            registerPlugin(AppControlPlugin.class);
        } catch (Exception e) {
            Log.e("Intercom", "Plugin register error: " + e.getMessage());
        }
        super.onCreate(savedInstanceState);
        // Enable WebView remote debugging only for debuggable builds
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // Allow mixed content so ws:// endpoints can be used when the app runs over https://localhost
        // Note: Prefer WSS in production. This relaxes Chromium's mixed content policy inside WebView.
        try {
            WebView wv = this.bridge.getWebView();
            if (wv != null) {
                WebSettings ws = wv.getSettings();
                ws.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            }
        } catch (Exception e) {
            Log.w("Intercom", "Failed to set mixed content mode: " + e.getMessage());
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent == null) return;
        String action = intent.getAction();
        if ("com.eyevinn.intercom.EXIT".equals(action)) {
            try {
                // Attempt to stop foreground services first
                try { stopService(new Intent(this, OverlayService.class)); } catch (Exception ignored) {}
                try { stopService(new Intent(this, CallService.class)); } catch (Exception ignored) {}
            } catch (Exception ignored) {}
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                finishAndRemoveTask();
            } else {
                finish();
            }
        }
        // 'OPEN' action is handled by OS bringing the activity to foreground via contentIntent
    }
}
