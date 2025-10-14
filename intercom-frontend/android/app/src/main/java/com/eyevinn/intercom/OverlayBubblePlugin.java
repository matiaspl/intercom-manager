package com.eyevinn.intercom;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

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
        if (!Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
        }
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
}

