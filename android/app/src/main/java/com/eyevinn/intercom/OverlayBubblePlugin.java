package com.eyevinn.intercom;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "OverlayBubble")
public class OverlayBubblePlugin extends Plugin {
    private BroadcastReceiver receiver;

    @Override
    public void load() {
        IntentFilter filter = new IntentFilter(OverlayService.ACTION);
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getStringExtra("action");
                JSObject payload = new JSObject();
                payload.put("action", action);
                try { payload.put("index", intent.getIntExtra("index", -1)); } catch (Exception ignored) {}
                notifyListeners("bubbleAction", payload);
            }
        };
        getContext().registerReceiver(receiver, filter);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        try { if (receiver != null) getContext().unregisterReceiver(receiver); } catch (Exception ignored) {}
    }

    @PluginMethod
    public void canDrawOverlays(PluginCall call) {
        boolean granted = Settings.canDrawOverlays(getContext());
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void openOverlayPermission(PluginCall call) {
        try {
            if (!Settings.canDrawOverlays(getContext())) {
                // Try app-specific overlay permission screen
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(intent);
            }
        } catch (Exception ignored) {}
        try {
            // Fallback to general overlay settings if needed
            Intent general = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
            general.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(general);
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (!Settings.canDrawOverlays(getContext())) {
            call.reject("Overlay permission not granted");
            return;
        }
        Context ctx = getContext();
        Intent svc = new Intent(ctx, OverlayService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(svc);
        } else {
            ctx.startService(svc);
        }
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Context ctx = getContext();
        Intent svc = new Intent(ctx, OverlayService.class);
        ctx.stopService(svc);
        call.resolve();
    }

    @PluginMethod
    public void setCallRows(PluginCall call) {
        try {
            int count = call.getInt("count", 0);
            com.getcapacitor.JSArray latchArr = call.getArray("latch");
            com.getcapacitor.JSArray listenArr = call.getArray("listen");
            com.getcapacitor.JSArray allowedArr = call.getArray("micAllowed");
            boolean[] latch = new boolean[count];
            boolean[] listen = new boolean[count];
            boolean[] allowed = new boolean[count];
            for (int i = 0; i < count; i++) {
                try { latch[i] = latchArr != null && Boolean.TRUE.equals(latchArr.getBoolean(i)); } catch (Exception e) { latch[i] = false; }
                try { listen[i] = listenArr != null && Boolean.TRUE.equals(listenArr.getBoolean(i)); } catch (Exception e) { listen[i] = true; }
                try { allowed[i] = allowedArr != null && Boolean.TRUE.equals(allowedArr.getBoolean(i)); } catch (Exception e) { allowed[i] = true; }
            }
            Intent intent = new Intent("com.eyevinn.intercom.BUBBLE_UPDATE");
            intent.putExtra("count", count);
            intent.putExtra("latch", latch);
            intent.putExtra("listen", listen);
            intent.putExtra("allowed", allowed);
            getContext().sendBroadcast(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set rows: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("running", OverlayService.isRunning);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33) {
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
            }
        }
        call.resolve();
    }
}
