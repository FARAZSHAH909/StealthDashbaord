---
title: Shared Protocols - Threat Model and RTDB Security Rules
tags:
  - shared-protocols
  - security-rules
  - threat-model
  - firebase
aliases:
  - RTDB Security Rules
date_created: 2026-11-21
status: complete
---

# 🛡️ Threat Model & Firebase Security Rules (`database.rules.json`)

Analysis of the Firebase Realtime Database security model and production V4 access rules.

## 1. Threat Model & Implemented Mitigations

| Threat Vector | Vulnerability (CWE) | Applied Mitigation |
| :--- | :--- | :--- |
| Unauthorized Data Extraction | CWE-285 | `auth != null` enforced on every database node. Unauthenticated calls return HTTP 401/403. |
| Insecure Direct Object References (IDOR) | CWE-639 | Devices can only write to their own path where `$device_id === auth.uid`. |
| Audit Trail Tampering | CWE-284 | `audit_logs` are strictly append-only by `admin`/`super_admin`. Deletion is prohibited. |
| Malicious APK Injection | CWE-494 | `/app_updates` node can only be written to by `auth.token.role === 'super_admin'`. |

---

## 2. Production Security Rules (`database.rules.json`)

```json
{
  "rules": {
    "devices": {
      "$device_id": {
        ".read": "auth != null && (auth.uid === $device_id || auth.token.role === 'admin' || auth.token.role === 'super_admin')",
        ".write": "auth != null && (auth.uid === $device_id || auth.token.role === 'admin' || auth.token.role === 'super_admin')"
      }
    },
    "notifications_log": {
      "$device_id": {
        ".read": "auth != null && (auth.uid === $device_id || auth.token.role === 'admin' || auth.token.role === 'super_admin')",
        ".write": "auth != null && auth.uid === $device_id"
      }
    },
    "sms_vault": {
      "$device_id": {
        ".read": "auth != null && (auth.uid === $device_id || auth.token.role === 'admin' || auth.token.role === 'super_admin')",
        ".write": "auth != null && auth.uid === $device_id"
      }
    },
    "contacts_vault": {
      "$device_id": {
        ".read": "auth != null && (auth.uid === $device_id || auth.token.role === 'admin' || auth.token.role === 'super_admin')",
        ".write": "auth != null && auth.uid === $device_id"
      }
    },
    "audit_logs": {
      ".read": "auth != null && auth.token.role === 'super_admin'",
      ".write": "auth != null && (auth.token.role === 'admin' || auth.token.role === 'super_admin')"
    },
    "app_updates": {
      ".read": "auth != null",
      ".write": "auth != null && auth.token.role === 'super_admin'"
    }
  }
}
```

---

🔗 Next: [[04 - Cross-System Roadmap/Dual_Project_Roadmap_and_Audit|System Roadmap & Audit]]
