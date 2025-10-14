package com.eyevinn.intercom;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

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
    }
}
