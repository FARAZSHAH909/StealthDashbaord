---
title: Secure Admin Dashboard - API Endpoints Reference
tags:
  - secure-admin-dashboard
  - api-reference
  - rest
project: Secure Admin Dashboard
aliases:
  - Web API Reference
date_created: 2026-11-21
status: complete
---

# 📡 Secure Admin Dashboard — API Endpoints Reference

All backend API routes are implemented in the Next.js 14 App Router (`src/app/api/...`) and wrapped with `src/lib/api/secureApiHandler.js`.

## 1. Authentication & Session Endpoints

### `POST /api/auth/sync-login`
- **Description:** Authenticates admin credentials and issues a signed HTTP-only session cookie.
- **Security:** Protected by sliding-window rate limiters for IP and user account.
- **Request Body:**
  ```json
  {
    "email": "admin@domain.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": { "uid": "...", "email": "...", "role": "admin" }
  }
  ```

### `POST /api/auth/verify-session`
- **Description:** Validates the HMAC-SHA256 signature on the active session cookie.
- **Security:** Evaluated with `crypto.timingSafeEqual`.

### `POST /api/auth/progressive-lockout`
- **Description:** Tracks failed authentication attempts and calculates lockout cooldowns.

---

## 2. Device Management Endpoints

### `POST /api/devices/enroll`
- **Description:** Enrolls a new Android device into the system and records its public key.
- **Security:** Rate-limited and requires valid hardware fingerprint payload.
- **Request Body:**
  ```json
  {
    "deviceId": "dev_abc123",
    "model": "Samsung S24",
    "osVersion": "Android 14",
    "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE..."
  }
  ```

### `POST /api/devices/generate-token`
- **Description:** Generates a secure Firebase RTDB REST access token for an enrolled device.
- **Security:** **Restricted to Admin and Super Admin** (`requiredRole: 'admin'`).

---

## 3. Cryptographic Vault Endpoints

### `POST /api/admin/vault-init`
- **Description:** Initializes the system master cryptographic key vault.
- **Security:** Super Admin only (`requiredRole: 'super_admin'`).

### `POST /api/admin/vault-update`
- **Description:** Rotates master passphrase and re-encrypts vault keys.
- **Security:** Super Admin only.

### `GET /api/v1/admin/audit-logs`
- **Description:** Fetches immutable administrative security event logs.
- **Security:** Super Admin only.

---

🔗 Next: [[Realtime_Sync_and_Firebase|Realtime Sync & Custom Hooks]] | [[Security_and_DevSecOps|Security Hardening & DevSecOps]]
