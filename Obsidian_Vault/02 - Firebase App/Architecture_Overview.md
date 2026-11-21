---
title: Firebase App - Mobile Architecture Overview
tags:
  - firebase-app
  - android
  - mobile
  - architecture
project: Firebase App
aliases:
  - Mobile App Overview
date_created: 2026-11-21
status: active
---

# 📱 Firebase App — Mobile Architecture Overview

> [!NOTE] Project Identification
> - **Project Name:** Firebase App
> - **Platform:** Android Mobile OS (API Level 26+ through Android 14 / 15)
> - **Codebase Path:** `C:\Users\mj\.gemini\antigravity\brain\6fa972e2-221e-4800-b907-fe27c49ff2d8\scratch\StealthApp`
> - **Remote Git Repo:** `https://github.com/FARAZSHAH909/StealthApp.git` (Branch: `main`)
> - **Primary Tech Stack:** Java, Android SDK, AndroidX Room, SQLCipher, Android KeyStore, WorkManager, OkHttp3

```mermaid
flowchart TD
    subgraph AndroidOS ["Android OS Subsystem"]
        Boot["BOOT_COMPLETED Intent"]
        NotificationEvents["NotificationListenerService Events"]
        ContentProviders["SMS & Contacts ContentProviders"]
    end

    subgraph AppMainProcess ["Firebase App (com.notrack.stealth - Main Process)"]
        BootRecv["BootReceiver.java"]
        StealthSvc["StealthService.java (Foregound / Notification Listener)"]
        BackupEngines["BackupObserverService (SmsBackupEngine & ContactsBackupEngine)"]
        RoomDB[("Local Room Database (Encrypted with SQLCipher)")]
        SyncWorker["SyncWorker.java (WorkManager Periodic Sync)"]
        KeystoreUtil["EncryptionUtils & KeyStore (EC P-256 / AES-GCM)"]
    end

    subgraph IsolatedProcess ["Secondary Isolated Process (:watchdog)"]
        WatchdogSvc["WatchdogService.java"]
        WatchdogRecv["WatchdogReceiver.java"]
    end

    subgraph FirebaseCloud ["Firebase Cloud Infrastructure"]
        RTDB[("Firebase RTDB (?auth=token Authenticated REST)")]
    end

    Boot --> BootRecv --> StealthSvc
    NotificationEvents --> StealthSvc
    ContentProviders --> BackupEngines
    StealthSvc --> RoomDB
    BackupEngines --> RoomDB
    RoomDB --> SyncWorker
    KeystoreUtil -->|Hardware-Backed Encryption| SyncWorker
    SyncWorker -->|Authenticated REST PUT ?auth=token| RTDB
    StealthSvc -.->|Heartbeat Ping| WatchdogSvc
    WatchdogSvc -.->|Auto-Revive If Killed| StealthSvc
```

---

## 🏗️ Core Mobile Architectural Principles

### 1. Dual-Process Watchdog Architecture
- If the main process (`com.notrack.stealth`) is killed by aggressive OEM battery managers or task cleaners, the isolated `:watchdog` process automatically revives the main service within seconds.

### 2. Zero Unauthenticated Network Calls
- Every outbound REST call requires a valid authentication token attached via `?auth=<token>` (`FirebaseHelper.getAuthTokenParam()`).
- Unauthenticated requests are rejected immediately by Firebase RTDB security rules.

### 3. Hardware-Backed TEE / StrongBox Encryption
- Cryptographic private keys reside directly inside the hardware **Android KeyStore (TEE / Secure Enclave)**.
- Even if the host device is rooted, private keys cannot be extracted from hardware.

---

## 🔗 Related Notes:
- Full File Map: [[Directory_and_File_Map|Directory and Java File Map]]
- Manifest & Permissions: [[Android_Manifest_and_Permissions|Android Manifest and Permissions]]
- Background & Watchdog: [[Background_Services_and_Watchdog|Background Services and Watchdog]]
- Local Database: [[Local_Database_Room_SQLCipher|Local Room Database]]
- Hardware Crypto: [[Hardware_Keystore_and_Crypto|Hardware KeyStore & Crypto]]
- Sync Engines: [[Sync_Engines_and_Firebase_REST|Sync Engines and Firebase REST]]
