# Android (Capacitor) – Intercom Frontend

This wraps the existing React/Vite app into a native Android container using Capacitor.

## Prerequisites

- Node 20 and Yarn Classic
- Android Studio (latest), Android SDKs, and an emulator or device
- Java 17 (Gradle Toolchain can install it automatically)

## Install dependencies

From `intercom-frontend`:

```
yarn
yarn add -D @capacitor/cli @capacitor/android
yarn add @capacitor/core
```

The project includes `capacitor.config.ts` and package scripts to streamline setup.

## Configure backend for mobile builds

At build time, you can set your backend URL and tokens as environment variables, then build. Alternatively, on mobile the app exposes Backend URL and Backend API Key fields in User Settings (these fields are hidden in the web build).

```
export VITE_BACKEND_URL=https://<your-intercom-manager>/
# Optional for OSC-hosted dev
export VITE_BACKEND_API_KEY=<service-access-token>
export OSC_ACCESS_TOKEN=<personal-access-token>

yarn build
```

Notes:
- For local development on an Android emulator, `localhost` inside the WebView is not your host machine. Use `http://10.0.2.2:<port>` to reach a service running on your host.
- For a physical device, use your host’s LAN IP, and ensure both are on the same network.

## Add Android platform

```
yarn cap:add:android
```

This generates `android/` with a native project. If you updated web assets, run:

```
yarn android:build   # builds web and syncs to Android project
```

## Open in Android Studio

```
yarn android:open
```

Then Run ➝ Run ‘app’ to start on an emulator or connected device.

## Permissions required (microphone/WebRTC)

Open `android/app/src/main/AndroidManifest.xml` and ensure these permissions are present:

```
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<!-- Optional for headsets/Bluetooth on newer Android versions -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

If you need to connect to an `http://` backend during development, either:

- Set `server.androidScheme` and network security to allow cleartext, or
- Prefer `https://` to keep a secure context for WebRTC.

To allow cleartext just for development, set on the `<application>` tag:

```
android:usesCleartextTraffic="true"
```

## Live reload (optional)

You can point the native app at the Vite dev server for faster iteration.

1) Start Vite dev server:

```
yarn dev
```

2) In `capacitor.config.ts`, set the server to your dev URL (emulator example):

```
server: {
  url: 'http://10.0.2.2:5173',
  androidScheme: 'http'
}
```

3) Run on device/emulator with live reload:

```
yarn cap:run:android
```

When switching back to bundled assets, remove the `server.url` and run:

```
yarn android:build
```

## WebRTC notes

- Android WebView supports WebRTC; user permission prompts are forwarded by Capacitor.
- Make sure your backend uses valid TLS certificates in production for a proper secure context.
- Autoplay rules still apply; user interaction may be required to start audio.

## Building a release APK/AAB

Use Android Studio: Build ➝ Generate Signed Bundle / APK.
Follow the wizard to create a keystore and sign. Remember to run `yarn android:build` before creating a release.

## Troubleshooting

- Microphone prompt doesn’t appear: verify manifest permissions and test on Android 10+.
- Cannot reach backend from emulator: use `10.0.2.2` instead of `localhost`.
- CORS issues against remote backend: ensure backend allows your app’s origin; for OSC, use the service access token as documented in the frontend README.

## Remote Debugging WebViews

WebView remote debugging is enabled for debug builds. Steps:

1. Enable Developer Options and USB debugging on your Android device.
2. Connect your device via USB (or use an emulator).
3. On your desktop Chrome, open `chrome://inspect` and click "Discover USB devices".
4. Your app’s WebView should appear under Remote Target. Click "inspect" to open DevTools.

Note: WebView debugging is enabled via `WebView.setWebContentsDebuggingEnabled(true)` in `MainActivity` for debug builds only.
- Security: the Backend API Key is stored locally on the device (app storage/localStorage). Treat it as sensitive and rotate if exposed.
