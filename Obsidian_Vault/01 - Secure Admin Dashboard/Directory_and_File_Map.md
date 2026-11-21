---
title: Secure Admin Dashboard - Directory and File Map (A-to-Z)
tags:
  - secure-admin-dashboard
  - file-map
  - web
project: Secure Admin Dashboard
aliases:
  - Web File Map
date_created: 2026-11-21
status: complete
---

# 📂 Secure Admin Dashboard — Directory and File Map (A-to-Z)

This document provides a complete file-by-file breakdown of the Secure Admin Dashboard web project.

## 📁 `src/` (Core Application Source)

### 1. `src/middleware.js`
- **Purpose:** Next.js Edge Middleware route guard.
- **Security Role:** Checks incoming HTTP requests for valid session tokens on protected routes (`/dashboard/*`). Redirects invalid requests to `/login`.

---

## 📁 `src/app/` (Next.js 14 App Router Pages)

| File Path | Description | Access Level |
| :--- | :--- | :--- |
| `src/app/layout.jsx` | Root layout, font definitions, and global providers (`AuthContext`, `KeyVaultContext`). | Public |
| `src/app/page.jsx` | Root landing & redirect handler (routes to login or dashboard). | Public |
| `src/app/globals.css` | Global Tailwind CSS rules and dark theme styles. | Public |
| `src/app/login/page.jsx` | Admin login page (Email/password with MFA handling). | Public |
| `src/app/register/page.jsx` | Admin account registration form. | Public (Admin approval required) |
| `src/app/pending-approval/page.jsx` | Holding screen for accounts awaiting approval. | Authenticated |
| `src/app/verify-email/page.jsx` | Email verification status and resend trigger. | Authenticated |
| `src/app/portal-access/[token]/page.jsx` | One-time emergency token portal access. | Token-Guarded |

### 📁 `src/app/dashboard/` (Protected Admin Modules)

| File Path | Dashboard Module | Associated Database Node |
| :--- | :--- | :--- |
| `src/app/dashboard/overview/page.jsx` | Overview KPI metrics, live enrolled devices, and system status. | `/devices`, `/audit_logs` |
| `src/app/dashboard/devices/page.jsx` | Enrolled Android devices table, status, and token generator. | `/devices` |
| `src/app/dashboard/messages/page.jsx` | Live decrypted notification stream feed. | `/notifications_log` |
| `src/app/dashboard/conversations/page.jsx` | Grouped conversation views by app package and thread. | `/notifications_log` |
| `src/app/dashboard/sms/page.jsx` | Decrypted SMS inbox & outbox message explorer. | `/sms_vault` |
| `src/app/dashboard/contacts/page.jsx` | Address book contact list with search & filter. | `/contacts_vault` |
| `src/app/dashboard/media/page.jsx` | Uploaded attachments and media files viewer. | `/media_vault` |
| `src/app/dashboard/sync-logs/page.jsx` | Device sync health, battery level, network type, and ping time. | `/sync_status` |
| `src/app/dashboard/security/page.jsx` | Security audit trail, active session revocation, and role assignment. | Firestore `audit_logs` |
| `src/app/dashboard/users/page.jsx` | Administrator user management, account approval, and deactivation. | Firestore `users` |
| `src/app/dashboard/app-updates/page.jsx` | Android APK release publishing, version control, and rollback manager. | `/app_updates` |
| `src/app/dashboard/analytics/page.jsx` | Telemetry analytics and event frequency charts. | Analytics |

---

## 📁 `src/app/api/` (Secure Server-Side API Endpoints)

- `src/app/api/admin/approvals/route.js` — Admin account approvals (Super Admin only).
- `src/app/api/admin/users/route.js` — Admin user listing and role updates.
- `src/app/api/admin/vault-init/route.js` — Master cryptographic vault initialization.
- `src/app/api/admin/vault-update/route.js` — Master vault key rotation and re-wrapping.
- `src/app/api/auth/sync-login/route.js` — Secure authentication and session token issuance.
- `src/app/api/auth/progressive-lockout/route.js` — Exponential delay tracker for failed logins.
- `src/app/api/auth/verify-session/route.js` — Constant-time HMAC-SHA256 session token verification.
- `src/app/api/devices/enroll/route.js` — Android device enrollment and public key registration.
- `src/app/api/devices/generate-token/route.js` — Device RTDB authentication token generator (Admin only).
- `src/app/api/app-update/route.js` — APK version metadata, SHA-256 hash, and download URL endpoint.

---

## 📁 `src/lib/` (Core Libraries & Cryptographic Engine)

### 🔐 `src/lib/encryption/`
- `webCrypto.js` — W3C WebCrypto API wrapper (AES-256-GCM, ECDH P-256, PBKDF2).
- `KeyVaultContext.jsx` — React Context holding decryption keys in volatile memory only.
- `vaultDecryptor.js` — High-performance stream decryptor for incoming RTDB records.
- `masterVaultService.js` — Master key derivation and BIP-39 mnemonic recovery.
- `signatureUtils.js` — Cryptographic signature creation and verification.

### 🛡️ `src/lib/auth/`
- `sessionCrypto.js` — HMAC-SHA256 session creation with `crypto.timingSafeEqual` validation.
- `rbac.js` — Role definitions (`super_admin`, `admin`, `viewer`) and permission rules.
- `rateLimiter.js` — Sliding window rate limiter for IP and token endpoints.
- `AuthContext.jsx` — React authentication state listener and session refresher.

### ☁️ `src/lib/firebase/`
- `admin.js` — Firebase Admin SDK initialized with service account credentials.
- `client.js` — Firebase Client SDK for web browser realtime subscriptions.
- `firestoreService.js` — Cloud Firestore helpers for audit logs and user records.

---

🔗 Next: [[Authentication_and_RBAC|Authentication and RBAC]] | [[Key_Vault_and_Crypto_Engine|Key Vault and Crypto Engine]]
