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

`app/src/main/AndroidManifest.xml` में कॉन्फ़िगर की गई सभी सुरक्षा नीतियां और अनुमतियां।

## 1. आवश्यक सिस्टम अनुमतियाँ (System Permissions)

| अनुमति | उपयोग का कारण | सुरक्षा प्रभाव |
| :--- | :--- | :--- |
| `android.permission.INTERNET` | Firebase RTDB और अपडेट सर्वर से संचार | आउटबाउंड HTTPS कनेक्शन |
| `android.permission.RECEIVE_BOOT_COMPLETED` | फोन ऑन होते ही बैकग्राउंड सर्विसेज शुरू करना | लगातार सुरक्षा निगरानी |
| `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Doze मोड में ऐप को बंद होने से बचाना | निरंतर बैकग्राउंड सिंक |
| `android.permission.FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_DATA_SYNC` | Android 14+ अनुकूल डेटा सिंक सर्विस | OS द्वारा सर्विस किल होने से बचाव |
| `android.permission.READ_SMS` | SMS बैकअप इंजन के लिए इनबॉक्स/आउटबॉक्स पढ़ना | संवेदनशील डेटा (E2EE एनक्रिप्टेड) |
| `android.permission.READ_CONTACTS` | कॉन्टैक्ट्स बैकअप इंजन के लिए एड्रेस बुक पढ़ना | संवेदनशील डेटा (E2EE एनक्रिप्टेड) |
| `android.permission.REQUEST_INSTALL_PACKAGES` | रिमोट APK अपडेट इंस्टॉलेशन | केवल सत्यापित SHA-256 APK |

---

## 2. StrandHogg 2.0 टास्क हाईजैकिंग सुरक्षा (Task Hijacking Mitigation)
मोबएसएफ और SAST ऑडिट में टास्क हाईजैकिंग एक गंभीर भेद्यता (CWE-1021) पाई गई थी। इसे ठीक करने के लिए `MainActivity` को इस प्रकार सुरक्षित किया गया है:

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
- `launchMode="singleInstance"`: ऐप का अपना अलग टास्क स्टैक होता है।
- `taskAffinity=""`: किसी भी मलेशियस थर्ड-पार्टी ऐप को इस एक्टिविटी के टास्क स्टैक को हाईजैक करने से रोकता है।

---

## 3. नेटवर्क सुरक्षा कॉन्फ़िगरेशन (`network_security_config.xml`)
- ऐप में केवल **TLS 1.3 और TLS 1.2** के माध्यम से HTTPS ट्रैफिक की अनुमति है।
- प्लेनटेक्स्ट HTTP ट्रैफिक (`cleartextTrafficPermitted="false"`) पूरी तरह से प्रतिबंधित है।

---

🔗 आगे पढ़ें: [[Background_Services_and_Watchdog|बैकग्राउंड सर्विसेज और वॉचडॉग]] | [[Hardware_Keystore_and_Crypto|हार्डवेयर की-स्टोर]]
