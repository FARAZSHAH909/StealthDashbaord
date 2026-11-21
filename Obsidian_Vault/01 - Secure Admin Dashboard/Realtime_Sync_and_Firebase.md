---
title: Secure Admin Dashboard - Realtime Sync & Firebase Hooks
tags:
  - secure-admin-dashboard
  - realtime-sync
  - react-hooks
  - firebase
project: Secure Admin Dashboard
aliases:
  - Web Realtime Sync
date_created: 2026-11-21
status: complete
---

# 🔄 Realtime Sync & Custom React Hooks

The web dashboard uses modular React hooks to maintain live WebSocket connections with Firebase Realtime Database (RTDB).

## 1. Core Data Hook: `useFirebaseData.js`
- **Purpose:** Subscribes to real-time events (`onValue`) on any arbitrary RTDB path.
- **Memory Cleanup:** Automatically unbinds listeners (`off`) on component unmount to prevent memory leaks and zombie connections.

```javascript
// Example Usage
const { data, loading, error } = useFirebaseData(`notifications_log/${deviceId}`);
```

---

## 2. SMS Vault Hook: `useSmsVault.js`
- **Purpose:** Subscribes to `/sms_vault/${deviceId}`.
- **Automatic Stream Decryption:** Listens for new encrypted SMS messages, automatically decrypts them via `KeyVaultContext` using the device AES key, and updates the UI state in real time.

---

## 3. Contacts Vault Hook: `useContactsVault.js`
- **Purpose:** Subscribes to `/contacts_vault/${deviceId}`.
- **Client-Side Indexing:** Organizes contacts into searchable alphabetical indexes for instantaneous search by name or telephone number.

---

## 4. App Update Management Hook: `useAppUpdate.js`
- **Purpose:** Subscribes to `/app_updates`.
- **Release Verification:** Tracks live APK version numbers, validates SHA-256 integrity checksums, and manages forced remote update flags.

---

🔗 Next: [[Security_and_DevSecOps|Security Hardening & DevSecOps]] | [[03 - Shared Protocols & RTDB/Realtime_Database_Schema|RTDB Schema]]
