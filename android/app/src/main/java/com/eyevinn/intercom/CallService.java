package com.eyevinn.intercom;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

public class CallService extends Service {
    public static final String CHANNEL_ID = "intercom_call_channel";
    public static final int NOTIF_ID = 2;
    public static volatile boolean running = false;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        ensureChannel();
        // PendingIntents for notification actions
        int flags = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                ? (android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE)
                : android.app.PendingIntent.FLAG_UPDATE_CURRENT;

        android.content.Intent openIntent = new android.content.Intent(this, MainActivity.class);
        openIntent.setAction("com.eyevinn.intercom.OPEN");
        openIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
        android.app.PendingIntent openPI = android.app.PendingIntent.getActivity(this, 2001, openIntent, flags);

        android.content.Intent exitIntent = new android.content.Intent(this, MainActivity.class);
        exitIntent.setAction("com.eyevinn.intercom.EXIT");
        exitIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
        android.app.PendingIntent exitPI = android.app.PendingIntent.getActivity(this, 2002, exitIntent, flags);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Intercom running")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setContentIntent(openPI)
                .addAction(0, "Open", openPI)
                .addAction(0, "Exit", exitPI)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .build();
        startForeground(NOTIF_ID, notification);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        running = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(Service.STOP_FOREGROUND_REMOVE);
        } else {
            stopFgCompat();
        }
    }

    @SuppressWarnings("deprecation")
    private void stopFgCompat() {
        stopForeground(true);
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID,
                    "Intercom Calls",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }
}
