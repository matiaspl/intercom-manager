package com.eyevinn.intercom;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
// import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.WindowManager;
import android.view.ViewConfiguration;
import android.widget.ImageView;
import android.widget.LinearLayout;

import androidx.core.app.NotificationCompat;

public class OverlayService extends Service {
    public static final String ACTION = "com.eyevinn.intercom.BUBBLE_ACTION";
    public static final String ACTION_UPDATE = "com.eyevinn.intercom.BUBBLE_UPDATE";
    public static volatile boolean isRunning = false;
    private WindowManager windowManager;
    private View overlayView;
    private WindowManager.LayoutParams params;
    private LinearLayout controlsContainer;
    private boolean expanded = true;
    private ImageView btnToggle;
    private int rowCount = 1;
    private boolean[] rowLatch = new boolean[] { false };
    private boolean[] rowListen = new boolean[] { true };
    private boolean[] rowPttHeld = new boolean[] { false };
    private boolean[] rowAllowed = new boolean[] { true };
    // Queue updates while any PTT is held to avoid canceling press visuals
    private boolean hasPendingUpdate = false;
    private int pendingCount = 0;
    private boolean[] pendingLatch = null;
    private boolean[] pendingListen = null;
    private boolean[] pendingAllowed = null;
    private android.content.BroadcastReceiver updateReceiver;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        isRunning = true;
        // Foreground notification (required on Android O+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = "intercom_bubble_channel";
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Intercom Floating Controls",
                    NotificationManager.IMPORTANCE_MIN
            );
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
            int flags = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                    ? (android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE)
                    : android.app.PendingIntent.FLAG_UPDATE_CURRENT;

            android.content.Intent openIntent = new android.content.Intent(this, MainActivity.class);
            openIntent.setAction("com.eyevinn.intercom.OPEN");
            openIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
            android.app.PendingIntent openPI = android.app.PendingIntent.getActivity(this, 2101, openIntent, flags);

            android.content.Intent exitIntent = new android.content.Intent(this, MainActivity.class);
            exitIntent.setAction("com.eyevinn.intercom.EXIT");
            exitIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
            android.app.PendingIntent exitPI = android.app.PendingIntent.getActivity(this, 2102, exitIntent, flags);

            Notification notification = new NotificationCompat.Builder(this, channelId)
                    .setContentTitle("Intercom controls active")
                    .setSmallIcon(android.R.drawable.ic_media_play)
                    .setOngoing(true)
                    .setContentIntent(openPI)
                    .addAction(0, "Open", openPI)
                    .addAction(0, "Exit", exitPI)
                    .build();
            startForeground(1, notification);
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        int type;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            // TYPE_PHONE is required pre-O for system alert windows
            type = legacyOverlayType();
        }

        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 50; params.y = 200;

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.HORIZONTAL);
        root.setBackgroundColor(0xAA222222);
        int pad = dp(8);
        root.setPadding(pad, pad, pad, pad);

        // Minimize (collapse/expand) button
        btnToggle = buildIconButton(android.R.drawable.ic_menu_view);
        btnToggle.setContentDescription("Minimize");
        btnToggle.setOnClickListener(v -> toggleControls());
        // Allow dragging the bubble by grabbing the minimize button
        btnToggle.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY; private float initialTouchX, initialTouchY; private boolean moved;
            final int slop = ViewConfiguration.get(OverlayService.this).getScaledTouchSlop();
            @Override public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x; initialY = params.y; moved = false;
                        initialTouchX = event.getRawX(); initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int)(event.getRawX() - initialTouchX);
                        int dy = (int)(event.getRawY() - initialTouchY);
                        if (Math.abs(dx) > slop || Math.abs(dy) > slop) moved = true;
                        params.x = initialX + dx; params.y = initialY + dy;
                        windowManager.updateViewLayout(overlayView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) v.performClick();
                        return true;
                }
                return false;
            }
        });
        root.addView(btnToggle);

        // Controls container (multiple rows)
        controlsContainer = new LinearLayout(this);
        controlsContainer.setOrientation(LinearLayout.VERTICAL);
        
        root.addView(controlsContainer);
        buildRows();

        overlayView = root;

        windowManager.addView(overlayView, params);
        // Register for updates from plugin
        updateReceiver = new android.content.BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (ACTION_UPDATE.equals(intent.getAction())) {
                    int c = intent.getIntExtra("count", rowCount);
                    boolean[] latch = intent.getBooleanArrayExtra("latch");
                    boolean[] listen = intent.getBooleanArrayExtra("listen");
                    boolean[] allowed = intent.getBooleanArrayExtra("allowed");
                    // If any PTT is currently held, queue the update to avoid canceling the press
                    boolean anyHeld = false;
                    if (rowPttHeld != null) {
                        for (boolean held : rowPttHeld) { if (held) { anyHeld = true; break; } }
                    }
                    if (anyHeld) {
                        hasPendingUpdate = true;
                        pendingCount = Math.max(1, c);
                        pendingLatch = latch;
                        pendingListen = listen;
                        pendingAllowed = allowed;
                        return;
                    }
                    int prevCount = rowCount;
                    boolean[] prevHeld = rowPttHeld;
                    rowCount = Math.max(1, c);
                    rowLatch = (latch != null && latch.length == rowCount) ? latch : new boolean[rowCount];
                    rowListen = (listen != null && listen.length == rowCount) ? listen : new boolean[rowCount];
                    rowAllowed = (allowed != null && allowed.length == rowCount) ? allowed : new boolean[rowCount];
                    // Preserve held PTT state across updates
                    boolean[] nextHeld = new boolean[rowCount];
                    if (prevHeld != null) {
                        int copy = Math.min(prevCount, rowCount);
                        for (int i = 0; i < copy; i++) nextHeld[i] = prevHeld[i];
                    }
                    rowPttHeld = nextHeld;
                    buildRows();
                }
            }
        };
        registerReceiver(updateReceiver, new android.content.IntentFilter(ACTION_UPDATE));
    }

    @SuppressWarnings("deprecation")
    private static int legacyOverlayType() {
        return WindowManager.LayoutParams.TYPE_PHONE;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_NOT_STICKY;
    }

    private ImageView buildIconButton(int resId) {
        ImageView iv = new ImageView(this);
        iv.setImageResource(resId);
        int m = dp(4); int p = dp(8);
        iv.setPadding(p, p, p, p);
        int size = dp(72);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
        lp.setMargins(m, 0, m, 0);
        iv.setLayoutParams(lp);
        iv.setBackgroundColor(0xFF444444);
        iv.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        return iv;
    }

    private View buildTextButton(String text) {
        android.widget.TextView tv = new android.widget.TextView(this);
        tv.setText(text);
        tv.setTextColor(0xFFFFFFFF);
        tv.setTextSize(18);
        tv.setGravity(android.view.Gravity.CENTER);
        int m = dp(4); int p = dp(8);
        tv.setPadding(p, p, p, p);
        int size = dp(72);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
        lp.setMargins(m, 0, m, 0);
        tv.setLayoutParams(lp);
        tv.setBackgroundColor(0xFF444444);
        return tv;
    }

    // Indicator helper removed; UI now uses icon states only

    private void toggleControls() {
        expanded = !expanded;
        if (controlsContainer != null) {
            controlsContainer.setVisibility(expanded ? View.VISIBLE : View.GONE);
        }
    }

    private void updateVisualState() { /* indicators updated via buildRows() on state push */ }

    private int dp(int v) { return (int)(getResources().getDisplayMetrics().density * v); }

    private void sendAction(String action) {
        Intent intent = new Intent(ACTION);
        intent.putExtra("action", action);
        sendBroadcast(intent);
    }

    private void sendAction(String action, int index) {
        Intent intent = new Intent(ACTION);
        intent.putExtra("action", action);
        intent.putExtra("index", index);
        sendBroadcast(intent);
    }

    private void buildRows() {
        controlsContainer.removeAllViews();
        for (int i = 0; i < rowCount; i++) {
            final int idx = i;
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            // Colors: green=enabled, red=disabled
            final int COLOR_ENABLED = 0xFF2E7D32;
            final int COLOR_DISABLED = 0xFFD32F2F;

            // Listen button (control only), UI reflects state from app
            ImageView listenBtn = buildIconButton(R.drawable.ic_volume_on);
            listenBtn.setContentDescription("Listen (toggle speaker route)");
            listenBtn.setOnClickListener(v -> sendAction("listen", idx));
            boolean listenOn = rowListen != null && rowListen.length > idx && rowListen[idx];
            listenBtn.setImageResource(listenOn ? R.drawable.ic_volume_on : R.drawable.ic_volume_off);
            listenBtn.setColorFilter(listenOn ? COLOR_ENABLED : COLOR_DISABLED);
            // Latch button (control only), UI reflects state from app
            ImageView micBtn = buildIconButton(R.drawable.ic_mic_on);
            micBtn.setContentDescription("Talk (latching)");
            micBtn.setOnClickListener(v -> sendAction("talk_latch", idx));
            boolean latch = rowLatch != null && rowLatch.length > idx && rowLatch[idx];
            micBtn.setImageResource(latch ? R.drawable.ic_mic_on : R.drawable.ic_mic_off);
            micBtn.setColorFilter(latch ? COLOR_ENABLED : COLOR_DISABLED);
            // PTT
            View pttBtn = buildTextButton("PTT");
            pttBtn.setContentDescription("PTT (press and hold)");
            if (rowPttHeld != null && rowPttHeld.length > idx && rowPttHeld[idx]) {
                pttBtn.setBackgroundColor(0xFF1565C0);
            }
            pttBtn.setOnTouchListener((v, event) -> {
                int action = event.getActionMasked();
                switch (action) {
                    case MotionEvent.ACTION_DOWN:
                    case MotionEvent.ACTION_POINTER_DOWN:
                        v.performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK);
                        v.setBackgroundColor(0xFF1565C0);
                        if (!rowPttHeld[idx]) {
                            rowPttHeld[idx] = true;
                            sendAction("ptt_down", idx);
                        }
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        // Keep local pressed state while finger remains down; do not auto-release on MOVE
                        return true;
                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL:
                        v.setBackgroundColor(0xFF444444);
                        if (rowPttHeld[idx]) {
                            rowPttHeld[idx] = false;
                            sendAction("ptt_up", idx);
                            // If there is a pending UI update queued while holding, apply it now
                            boolean anyStillHeld = false;
                            for (boolean held : rowPttHeld) { if (held) { anyStillHeld = true; break; } }
                            if (hasPendingUpdate && !anyStillHeld) {
                                int prevCount = rowCount;
                                boolean[] prevHeld = rowPttHeld;
                                rowCount = pendingCount > 0 ? pendingCount : rowCount;
                                rowLatch = (pendingLatch != null && pendingLatch.length == rowCount) ? pendingLatch : rowLatch;
                                rowListen = (pendingListen != null && pendingListen.length == rowCount) ? pendingListen : rowListen;
                                rowAllowed = (pendingAllowed != null && pendingAllowed.length == rowCount) ? pendingAllowed : rowAllowed;
                                // Reset pending flags
                                hasPendingUpdate = false;
                                pendingCount = 0;
                                pendingLatch = null;
                                pendingListen = null;
                                pendingAllowed = null;
                                // Ensure held state cleared
                                rowPttHeld = new boolean[rowCount];
                                buildRows();
                            }
                        }
                        return true;
                    case MotionEvent.ACTION_OUTSIDE:
                        return true;
                    case MotionEvent.ACTION_POINTER_UP:
                        // Ignore secondary pointer ups; rely on ACTION_UP/CANCEL for release
                        return true;
                    default:
                        return true;
                }
            });
            // Apply per-row mic/PTT availability
            boolean allowedRow = rowAllowed != null && rowAllowed.length > idx ? rowAllowed[idx] : true;
            micBtn.setEnabled(allowedRow);
            pttBtn.setEnabled(allowedRow);
            float alpha = allowedRow ? 1.0f : 0.4f;
            micBtn.setAlpha(alpha);
            pttBtn.setAlpha(alpha);
            row.addView(listenBtn);
            row.addView(micBtn);
            row.addView(pttBtn);
            controlsContainer.addView(row);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlayView != null) windowManager.removeView(overlayView);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(Service.STOP_FOREGROUND_REMOVE);
        } else {
            stopFgCompat();
        }
        isRunning = false;
        try { if (updateReceiver != null) unregisterReceiver(updateReceiver); } catch (Exception ignored) {}
    }

    @SuppressWarnings("deprecation")
    private void stopFgCompat() {
        stopForeground(true);
    }
}
