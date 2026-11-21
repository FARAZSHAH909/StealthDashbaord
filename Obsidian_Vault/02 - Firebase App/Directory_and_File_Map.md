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

This document provides a comprehensive breakdown of all packages, classes, and services within the Android mobile client.

## 📁 `com.notrack.stealth` (Root Package)

| Class / File | Type | Description |
| :--- | :--- | :--- |
| `StealthApp.java` | `Application` | Initializes application context, SQLCipher native libraries, WorkManager, and notification channels. |
| `MainActivity.java` | `Activity` | Entry activity. Uses `FLAG_SECURE` to block screenshots/screen capture; configured with `singleInstance` + `taskAffinity=""` to prevent StrandHogg 2.0 task hijacking. |
| `StealthService.java` | `NotificationListenerService` | Captures incoming notifications, encrypts payloads, and saves them to the local Room database. |
| `BootReceiver.java` | `BroadcastReceiver` | Listens for `BOOT_COMPLETED` and restarts background services immediately after device reboot. |
| `SessionInstallerHelper.java` | Helper | Uses Android 12+ PackageInstaller Session APIs for remote, background APK updates. |
| `SessionInstallReceiver.java` | `BroadcastReceiver` | Receives install callbacks and verifies successful APK update completion. |

---

## 📁 `com.notrack.stealth.backup` (Data Backup Engines)

- `BackupObserverService.java` — `ContentObserver` that monitors telephony and contacts providers for real-time changes.
- `SmsBackupEngine.java` — Scans SMS inbox and outbox, encrypts messages, and queues them for cloud synchronization.
- `ContactsBackupEngine.java` — Scans address book contacts, normalizes phone numbers, and backs them up securely.

---

## 📁 `com.notrack.stealth.db` (Local Encrypted Room Database)

- `AppDatabase.java` — Room database instance with 256-bit AES SQLCipher encryption.
- `NotificationEntity.java` & `NotificationDao.java` — Notification log table and CRUD query operations.
- `SmsEntity.java` & `SmsDao.java` — SMS messages table (id, sender, timestamp, encrypted body, sync status).
- `ContactEntity.java` & `ContactDao.java` — Address book contacts table.

---

## 📁 `com.notrack.stealth.security` (Hardware Cryptography)

- `EncryptionUtils.java` — AES-256-GCM symmetric encryption and payload packaging (IV + Ciphertext + Tag).
- `KeyEnrollmentHelper.java` — Generates EC P-256 keypairs in Android KeyStore and conducts enrollment with the web dashboard.
- `SecurityUtils.java` — Root detection, emulator checks, and package signature verification.

---

## 📁 `com.notrack.stealth.sync` (Network & Cloud Synchronization)

- `FirebaseHelper.java` — Authenticated HTTP REST client for Firebase Realtime Database (`?auth=<token>`).
- `SyncWorker.java` — WorkManager periodic background worker that pushes unsynced local records to RTDB in batches.
- `LegacyMigrationWorker.java` — Migrates legacy unencrypted records to the new E2EE schema format.

---

## 📁 `com.notrack.stealth.update` & `watchdog`

- `UpdateManager.java` & `UpdateDownloadService.java` — Handles background APK downloads, SHA-256 checksum verification, and updates.
- `WatchdogService.java` & `WatchdogReceiver.java` — Runs in the independent `:watchdog` process to guarantee the main service remains alive 24/7.

---

🔗 Next: [[Android_Manifest_and_Permissions|Android Manifest and Permissions]] | [[Background_Services_and_Watchdog|Background Services and Watchdog]]
