# Dairy Connect – App v4.3 – Client Instructions

## Version
- **App version:** 4.3 (versionCode 7)
- **Build:** Release APK (signed for distribution/testing)
- **Updates in 4.3:** Proper new patch update with latest improvements and bug fixes.

---

## Where is the APK?

After the build finishes, the release APK will be here:

```
AtharvNarayan\android\app\build\outputs\apk\release\app-release.apk
```

Rename before sending (optional):
- Example: `DairyConnect-v4.3-release.apk`

---

## How to build again (if needed)

1. Open terminal in project folder: `AtharvNarayan`
2. Run:
   ```bash
   cd android
   .\gradlew assembleRelease
   ```
3. APK will be at: `android\app\build\outputs\apk\release\app-release.apk`

---

## Client – How to install

1. **Enable “Install from unknown sources”** (or “Install unknown apps”) for the app you use to open the APK (e.g. Chrome, Files).
2. Copy `app-release.apk` to the phone (WhatsApp, email, Google Drive, etc.).
3. Open the APK file on the phone and tap **Install**.
4. If a previous version (Dairy Connect) is installed, it will **update** to v4.3.

---

## What’s in v4.2

- Full app with Cattle Feed Truck and Milk Truck flows
- Live trip location (driver → owner) and trip path on map
- Background location during active trip (Android)
- Owner dashboards with live map and trip history

---

## Support

- Backend API: `https://api.thetrifusion.in/api`
- For Play Store release later, a proper **release keystore** will be needed (this build uses debug signing for testing).
