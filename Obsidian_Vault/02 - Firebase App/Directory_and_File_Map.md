---
title: Firebase App - Directory and Java File Map (A-to-Z)
tags:
  - firebase-app
  - file-map
  - android
  - java
project: Firebase App
aliases:
  - Android File Map
date_created: 2026-11-21
status: complete
---

# 📂 Firebase App — Directory & Java File Map (A-to-Z)

यह दस्तावेज Android मोबाइल क्लाइंट के प्रत्येक पैकेज और क्लास का विवरण देता है।

## 📁 `com.notrack.stealth` (रूट पैकेज)

| क्लास / फ़ाइल | प्रकार | उद्देश्य |
| :--- | :--- | :--- |
| `StealthApp.java` | `Application` | ऐप लाइफसाइकिल, SQLCipher इनिशियलाइजेशन, वर्क मैनेजर और नोटिफिकेशन चैनल सेटअप। |
| `MainActivity.java` | `Activity` | लॉन्च एक्टिविटी। `FLAG_SECURE` के साथ स्क्रीनशॉट/रिकॉर्डिंग ब्लॉक करता है; `singleInstance` + `taskAffinity=""` के साथ StrandHogg अटैक रोकता है। |
| `StealthService.java` | `NotificationListenerService` | इनकमिंग नोटिफिकेशन्स को कैप्चर करता है, प्लेनटेक्स्ट को एनक्रिप्ट करता है और लोकल रूम DB में स्टोर करता है। |
| `BootReceiver.java` | `BroadcastReceiver` | डिवाइस रीबूट (`BOOT_COMPLETED`) पर सभी बैकग्राउंड सर्विसेज को तुरंत फिर से चालू करता है। |
| `SessionInstallerHelper.java` | Helper | Android 12+ पैकेज इंस्टॉलर सेशन API के जरिए साइलेंट/रिमोट APK इंस्टॉलेशन करता है। |
| `SessionInstallReceiver.java` | `BroadcastReceiver` | APK इंस्टॉलेशन की सफलता/असफलता के रिजल्ट्स प्राप्त करता है। |

---

## 📁 `com.notrack.stealth.backup` (डेटा बैकअप इंजन)

- `BackupObserverService.java` — `ContentObserver` जो डिवाइस में नया SMS आने या नया कॉन्टैक्ट सेव होने पर तुरंत बैकअप ट्रिगर करता है।
- `SmsBackupEngine.java` — टेलीफोनी प्रोवाइडर से SMS इनबॉक्स और आउटबॉक्स को बैच में रीड करके लोकल DB और RTDB में सिंक करता है।
- `ContactsBackupEngine.java` — कॉन्टैक्ट्स प्रोवाइडर से नाम, फोन नंबर और ईमेल पढ़कर सिंक करता है।

---

## 📁 `com.notrack.stealth.db` (लोकल एनक्रिप्टेड रूम डेटाबेस)

- `AppDatabase.java` — RoomDatabase एब्सट्रैक्शन (SQLCipher 256-बिट एन्क्रिप्शन सपोर्ट के साथ)।
- `NotificationEntity.java` & `NotificationDao.java` — नोटिफिकेशन लॉगिंग टेबल और CRUD ऑपरेशन्स।
- `SmsEntity.java` & `SmsDao.java` — SMS रिकॉर्ड्स टेबल (मैसेज ID, टाइमस्टैम्प, बॉडी, स्टेटस)।
- `ContactEntity.java` & `ContactDao.java` — एड्रेस बुक कॉन्टैक्ट्स टेबल।

---

## 📁 `com.notrack.stealth.security` (हार्डवेयर क्रिप्टोग्राफी)

- `EncryptionUtils.java` — AES-256-GCM सिमेट्रिक एन्क्रिप्शन और साइफरटेक्स्ट पैकेजिंग (IV + Ciphertext + Tag)।
- `KeyEnrollmentHelper.java` — EC P-256 की-पेयर जनरेट करता है और वेब डैशबोर्ड के साथ इनरोलमेंट हैंडशेक करता है।
- `SecurityUtils.java` — रूट डिटेक्शन, एमुलेटर डिटेक्शन और ऐप सिग्नेचर वेरिफिकेशन।

---

## 📁 `com.notrack.stealth.sync` (नेटवर्क और क्लाउड सिंक)

- `FirebaseHelper.java` — Firebase Realtime Database के लिए ऑथेंटिकेटेड HTTP REST क्लाइंट (`?auth=<token>`)।
- `SyncWorker.java` — Android WorkManager वर्कर जो नेटवर्क मिलने पर लोकल अनसिंक्ड रिकॉर्ड्स को बैच में RTDB में भेजता है।
- `LegacyMigrationWorker.java` — पुराने अन-एन्क्रिप्टेड डेटा को सुरक्षित फॉर्मेट में माइग्रेट करने वाला वर्कर।

---

## 📁 `com.notrack.stealth.update` & `watchdog`

- `UpdateManager.java` & `UpdateDownloadService.java` — बैकग्राउंड में नया APK डाउनलोड, SHA-256 हैश सत्यापन और इंस्टॉलेशन।
- `WatchdogService.java` & `WatchdogReceiver.java` — स्वतंत्र प्रोसेस (`:watchdog`) जो मुख्य ऐप के लाइव रहने की गारंटी देता है।

---

🔗 आगे पढ़ें: [[Android_Manifest_and_Permissions|मैनिफ़ेस्ट और अनुमतियाँ]] | [[Background_Services_and_Watchdog|बैकग्राउंड सर्विसेज और वॉचडॉग]]
