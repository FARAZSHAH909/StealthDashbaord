---
title: Firebase App - Android Manifest and Security Permissions
tags:
  - firebase-app
  - android
  - manifest
  - permissions
  - security
project: Firebase App
aliases:
  - Android Manifest Config
date_created: 2026-11-21
status: complete
---

# 📜 Android Manifest Configuration & Permissions

Details of all permissions, intent filters, and security hardening in `app/src/main/AndroidManifest.xml`.

## 1. Required System Permissions

| Permission | Purpose | Security Impact |
| :--- | :--- | :--- |
| `android.permission.INTERNET` | Firebase RTDB and update server communication. | Outbound HTTPS connections only. |
| `android.permission.RECEIVE_BOOT_COMPLETED` | Starts background services when device boots up. | Persistent monitoring. |
| `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Prevents OS battery savers from killing workers. | Uninterrupted background sync. |
| `android.permission.FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_DATA_SYNC` | Android 14+ compliant foreground sync service. | Prevents OS process reclamation. |
| `android.permission.READ_SMS` | Allows SMS backup engine to read incoming/outgoing texts. | E2EE encrypted immediately. |
| `android.permission.READ_CONTACTS` | Allows contacts backup engine to read address book. | E2EE encrypted immediately. |
| `android.permission.REQUEST_INSTALL_PACKAGES` | Allows remote APK update installation. | Restricted to verified SHA-256 APKs. |

---

## 2. StrandHogg 2.0 Task Hijacking Mitigation
MobSF identified StrandHogg 2.0 task hijacking (CWE-1021) as a risk in unconfigured activities. In `MainActivity`, this was completely eliminated:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleInstance"
    android:taskAffinity=""
    android:theme="@android:style/Theme.Material.Light.NoActionBar">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>
```
- `launchMode="singleInstance"`: Ensures the activity is isolated in its own dedicated task stack.
- `taskAffinity=""`: Prevents malicious apps from superimposing their tasks or intercepting user interactions.

---

## 3. Network Security Configuration (`network_security_config.xml`)
- Only **TLS 1.2 and TLS 1.3** encrypted connections are allowed.
- Cleartext HTTP traffic (`cleartextTrafficPermitted="false"`) is blocked at the OS network level.

---

🔗 Next: [[Background_Services_and_Watchdog|Background Services and Watchdog]] | [[Hardware_Keystore_and_Crypto|Hardware KeyStore & Crypto]]
