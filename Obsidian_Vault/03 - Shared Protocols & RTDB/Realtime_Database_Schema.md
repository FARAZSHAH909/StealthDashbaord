---
title: Shared Protocols - Firebase Realtime Database Schema
tags:
  - shared-protocols
  - firebase
  - database-schema
  - rtdb
aliases:
  - Unified RTDB Schema
date_created: 2026-11-21
status: complete
---

# 🗄️ Unified Firebase Realtime Database Schema

The shared data architecture connecting the [[01 - Secure Admin Dashboard/Architecture_Overview|Secure Admin Dashboard]] and the [[02 - Firebase App/Architecture_Overview|Firebase App]].

```mermaid
erDiagram
    FIREBASE_ROOT ||--o{ DEVICES : contains
    FIREBASE_ROOT ||--o{ NOTIFICATIONS_LOG : contains
    FIREBASE_ROOT ||--o{ SMS_VAULT : contains
    FIREBASE_ROOT ||--o{ CONTACTS_VAULT : contains
    FIREBASE_ROOT ||--o{ SYNC_STATUS : contains
    FIREBASE_ROOT ||--o{ APP_UPDATES : contains
    FIREBASE_ROOT ||--o{ ADMIN_CONFIG : contains

    DEVICES {
        string device_id PK
        string model
        string os_version
        string public_key
        long registered_at
        string status
    }

    NOTIFICATIONS_LOG {
        string device_id FK
        string log_id PK
        string package_name
        string encrypted_payload
        long timestamp
    }

    SMS_VAULT {
        string device_id FK
        string sms_id PK
        string sender
        string encrypted_body
        long date
        int type
    }

    CONTACTS_VAULT {
        string device_id FK
        string contact_id PK
        string display_name
        string encrypted_contact_data
        long last_updated
    }
```

---

## 1. Node Structure & Access Matrix

### `/devices/{deviceId}`
- **Permissions:** Device writes its own status; Admins read and write.
- **Payload:** Device model, Android OS version, EC P-256 public key, battery percentage, and last seen heartbeat timestamp.

### `/notifications_log/{deviceId}/{notificationId}`
- **Permissions:** Device writes its own records only; Admin reads.
- **Sample Record:**
  ```json
  {
    "package": "com.google.android.talk",
    "timestamp": 1795243444005,
    "payload": "IV:Ciphertext:Tag (AES-256-GCM)"
  }
  ```

### `/sms_vault/{deviceId}/{smsId}`
- **Permissions:** Device writes its own records only; Admin reads.
- **Payload:** Encrypted SMS body, sender identity, timestamp, and message direction.

### `/contacts_vault/{deviceId}/{contactId}`
- **Permissions:** Device writes its own records only; Admin reads.
- **Payload:** Encrypted address book entry and phone numbers.

### `/app_updates/`
- **Permissions:** Super Admin writes only; All devices read.
- **Sample Payload:**
  ```json
  {
    "versionCode": 4,
    "versionName": "1.0.4",
    "apkUrl": "https://storage.googleapis.com/.../app-release.apk",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "mandatory": true
  }
  ```

---

🔗 Next: [[End_to_End_Encryption_Handshake|E2EE Handshake]] | [[Threat_Model_and_Security_Rules|Threat Model & Rules]]
