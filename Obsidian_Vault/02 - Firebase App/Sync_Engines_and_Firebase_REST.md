---
title: Firebase App - Sync Engines and Authenticated REST
tags:
  - firebase-app
  - android
  - sync
  - rest-api
  - firebase
project: Firebase App
aliases:
  - Android Sync Engines
date_created: 2026-11-21
status: complete
---

# 🔄 Backup Engines & Authenticated Firebase REST

How the Android client captures, encrypts, and synchronizes data to Firebase Realtime Database over authenticated REST endpoints.

```mermaid
sequenceDiagram
    autonumber
    participant Engine as SmsBackupEngine / ContactsBackupEngine
    participant Room as Local Room DB
    participant Worker as SyncWorker (WorkManager)
    participant Helper as FirebaseHelper.java
    participant RTDB as Firebase Realtime Database

    Engine->>Room: Store Encrypted Records (isSynced = false)
    Worker->>Room: Query Unsynced Records (Batch of 50)
    Room-->>Worker: List of Encrypted Entities
    Worker->>Helper: Upload Batch (deviceId, records)
    Helper->>Helper: Append ?auth=<token>
    Helper->>RTDB: HTTPS PUT https://...firebasedatabase.app/sms_vault/{deviceId}.json?auth=TOKEN
    RTDB-->>Helper: HTTP 200 OK
    Helper-->>Worker: Success
    Worker->>Room: UPDATE Records SET isSynced = true
```

---

## 1. Token-Enforced REST Security (`FirebaseHelper.java`)
Under the V4 security hardening updates, all unauthenticated REST requests were permanently closed.
- `FirebaseHelper.java` automatically appends `?auth=<token>` to every outbound HTTP call:

```java
// Strictly enforce token parameter on all REST requests
String url = FIREBASE_DB_URL + "/" + node + "/" + deviceId + ".json" + getAuthTokenParam();
Request request = new Request.Builder()
    .url(url)
    .put(RequestBody.create(jsonPayload, JSON))
    .build();
```

---

## 2. Dedicated Backup Engines

### `SmsBackupEngine.java`
- Monitors telephony providers (`content://sms`) for incoming and outgoing SMS.
- Activated in real-time by `BackupObserverService`.
- Encrypts SMS content in memory before committing it to the local SQLite database.

### `ContactsBackupEngine.java`
- Scans `ContactsContract.CommonDataKinds.Phone`.
- Deduplicates and cleans phone numbers.
- Pushes encrypted contact snapshots whenever a contact is added or updated.

---

🔗 Next: [[03 - Shared Protocols & RTDB/Realtime_Database_Schema|RTDB Schema]] | [[03 - Shared Protocols & RTDB/Threat_Model_and_Security_Rules|Threat Model & Rules]]
