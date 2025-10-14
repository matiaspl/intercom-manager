package com.eyevinn.intercom;

import android.bluetooth.BluetoothA2dp;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothHeadset;
import android.bluetooth.BluetoothProfile;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "AudioRoute")
public class AudioRoutePlugin extends Plugin {
    private AudioManager audioManager;
    private BroadcastReceiver routeReceiver;

    @Override
    public void load() {
        Context ctx = getContext();
        audioManager = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        }

        // Listen for headset plug/unplug, Bluetooth and SCO changes
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_HEADSET_PLUG);
        filter.addAction(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED);
        filter.addAction(BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED);
        filter.addAction(BluetoothHeadset.ACTION_AUDIO_STATE_CHANGED);
        routeReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                emitRoutes();
            }
        };
        ctx.registerReceiver(routeReceiver, filter);

        // Initial emit
        emitRoutes();
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        try {
            if (routeReceiver != null) getContext().unregisterReceiver(routeReceiver);
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void hasBluetoothPermission(com.getcapacitor.PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            granted = ActivityCompat.checkSelfPermission(
                    getContext(),
                    Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED;
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBluetoothPermission(com.getcapacitor.PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ActivityCompat.checkSelfPermission(
                    getContext(),
                    Manifest.permission.BLUETOOTH_CONNECT
            ) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                        getActivity(),
                        new String[]{Manifest.permission.BLUETOOTH_CONNECT},
                        1003
                );
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void getAvailableRoutes(PluginCall call) {
        call.resolve(buildRoutesPayload());
    }

    private JSObject buildRoutesPayload() {
        JSObject ret = new JSObject();
        JSArray routes = new JSArray();

        boolean hasSpeaker = true; // assume always available
        boolean hasEarpiece = hasEarpiece();
        boolean hasHeadset = isWiredHeadsetOn();
        boolean hasBluetooth = isBluetoothOn();

        routes.put(routeObj("speaker", "Speaker", hasSpeaker));
        routes.put(routeObj("earpiece", "Earpiece", hasEarpiece));
        routes.put(routeObj("headset", "Headset", hasHeadset));
        routes.put(routeObj("bluetooth", "Bluetooth", hasBluetooth));

        ret.put("routes", routes);
        ret.put("active", getActiveRoute());
        return ret;
    }

    private void emitRoutes() {
        JSObject payload = buildRoutesPayload();
        notifyListeners("audioRouteChanged", payload);
    }

    private JSObject routeObj(String id, String label, boolean available) {
        JSObject o = new JSObject();
        o.put("id", id);
        o.put("label", label);
        o.put("available", available);
        return o;
    }

    private String getActiveRoute() {
        if (audioManager == null) return null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AudioDeviceInfo dev = audioManager.getCommunicationDevice();
            if (dev != null) {
                int t = dev.getType();
                if (t == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || t == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP) return "bluetooth";
                if (t == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) return "speaker";
                if (t == AudioDeviceInfo.TYPE_WIRED_HEADPHONES || t == AudioDeviceInfo.TYPE_WIRED_HEADSET) return "headset";
                if (t == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) return "earpiece";
            }
        }
        return getActiveRouteLegacy();
    }

    @SuppressWarnings("deprecation")
    private String getActiveRouteLegacy() {
        // Best-effort for pre-S devices
        if (audioManager.isBluetoothScoOn() || audioManager.isBluetoothA2dpOn()) return "bluetooth";
        if (audioManager.isSpeakerphoneOn()) return "speaker";
        if (isWiredHeadsetOn()) return "headset";
        if (hasEarpiece()) return "earpiece";
        return null;
    }

    private boolean hasEarpiece() {
        if (audioManager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
            for (AudioDeviceInfo d : devices) {
                if (d.getType() == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) return true;
            }
            return false;
        }
        // Pre-M fallback: assume phones have earpiece
        return true;
    }

    @SuppressWarnings("deprecation")
    private boolean isWiredHeadsetOn() {
        if (audioManager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
            for (AudioDeviceInfo d : devices) {
                if (d.getType() == AudioDeviceInfo.TYPE_WIRED_HEADPHONES || d.getType() == AudioDeviceInfo.TYPE_WIRED_HEADSET) return true;
            }
            return false;
        }
        return audioManager.isWiredHeadsetOn();
    }

    private boolean isBluetoothOn() {
        if (audioManager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
            for (AudioDeviceInfo d : devices) {
                int t = d.getType();
                if (t == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || t == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP) return true;
            }
            return false;
        }
        // Pre-M: use BluetoothManager to infer connection state
        android.bluetooth.BluetoothManager bm = (android.bluetooth.BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = bm != null ? bm.getAdapter() : null;
        if (adapter != null) {
            int a2dp = adapter.getProfileConnectionState(BluetoothProfile.A2DP);
            int headset = adapter.getProfileConnectionState(BluetoothProfile.HEADSET);
            return a2dp == BluetoothProfile.STATE_CONNECTED || headset == BluetoothProfile.STATE_CONNECTED;
        }
        return false;
    }

    @PluginMethod
    @SuppressWarnings("deprecation")
    public void setRoute(PluginCall call) {
        if (audioManager == null) { call.reject("AudioManager not available"); return; }
        String route = call.getString("route");
        if (route == null) { call.reject("Missing 'route'"); return; }

        switch (route) {
            case "speaker": {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    setCommDeviceByType(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER);
                } else {
                    audioManager.stopBluetoothSco();
                    audioManager.setBluetoothScoOn(false);
                    audioManager.setSpeakerphoneOn(true);
                }
                break;
            }
            case "earpiece": {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    setCommDeviceByType(AudioDeviceInfo.TYPE_BUILTIN_EARPIECE);
                } else {
                    audioManager.stopBluetoothSco();
                    audioManager.setBluetoothScoOn(false);
                    audioManager.setSpeakerphoneOn(false);
                }
                break;
            }
            case "headset": {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // Prefer wired headset/headphones
                    if (!setCommDeviceByType(AudioDeviceInfo.TYPE_WIRED_HEADPHONES)) {
                        setCommDeviceByType(AudioDeviceInfo.TYPE_WIRED_HEADSET);
                    }
                } else {
                    // Let system route to wired headset if plugged; ensure speaker is off
                    audioManager.stopBluetoothSco();
                    audioManager.setBluetoothScoOn(false);
                    audioManager.setSpeakerphoneOn(false);
                }
                break;
            }
            case "bluetooth": {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // Prefer SCO for comms, fallback to A2DP if needed
                    if (!setCommDeviceByType(AudioDeviceInfo.TYPE_BLUETOOTH_SCO)) {
                        setCommDeviceByType(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP);
                    }
                } else {
                    audioManager.startBluetoothSco();
                    audioManager.setBluetoothScoOn(true);
                    audioManager.setSpeakerphoneOn(false);
                }
                break;
            }
            default:
                call.reject("Unknown route: " + route);
                return;
        }

        JSObject ret = new JSObject();
        ret.put("active", getActiveRoute());
        call.resolve(ret);
        emitRoutes();
    }

    private boolean setCommDeviceByType(int type) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AudioDeviceInfo[] outs = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
            for (AudioDeviceInfo d : outs) {
                if (d.getType() == type) {
                    return audioManager.setCommunicationDevice(d);
                }
            }
        }
        return false;
    }
}
