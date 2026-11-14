# Cybersecurity Deep-Scan Audit Report: Next.js Web Dashboard & Firebase Backend

**Target System:** `SEALTHAPPDASHBOARD` (Next.js 14 App Router, Firebase Admin SDK, Realtime Database & Cloud Firestore)  
**Scan Engine:** MobSFScan v1.1.0, Semgrep v1.172.0 (OSS Engine with 354 Community Security Rules), and Antigravity Deep SAST Engine  
**Evaluation Mode:** Strict Read-Only Static Code Analysis (Zero Code Modifications)  
**Report Reference:** `AUDIT-WEB-DASHBOARD-20261114`  

---

## Executive Summary

A comprehensive automated and manual security audit of the Next.js Web Dashboard and Firebase backend was conducted using local SAST scanners.
Out of 132 scanned files, **8 security findings** were identified across API routes, authentication handlers, and database security rules.

---

## 1. Vulnerability Findings Matrix

| Finding ID | Vulnerability Title | CWE | Severity | Affected Component / File | Status |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **WEB-01** | Unsigned JWT Signature Bypass via Fallback Decoder | CWE-345 / CWE-287 | **CRITICAL** | `src/lib/api/secureApiHandler.js` & `src/app/api/auth/verify-session/route.js` | **ACTIVE** |
| **WEB-02** | Static Session Cookie Prefix Impersonation Bypass | CWE-287 / CWE-384 | **CRITICAL** | `src/lib/api/secureApiHandler.js` | **ACTIVE** |
| **WEB-03** | Unauthenticated Device Enrollment Token Minting | CWE-306 | **HIGH** | `src/app/api/devices/generate-token/route.js` | **ACTIVE** |
| **WEB-04** | Unauthenticated Write Allowed on Realtime Database | CWE-284 / CWE-400 | **HIGH** | `database.rules.json` (`notifications_log`) | **ACTIVE** |
| **WEB-05** | Broad Write Access on Admin Configuration & Audit Logs | CWE-284 | **MEDIUM** | `database.rules.json` (`audit_logs`, `admin_config`) | **ACTIVE** |
| **WEB-06** | Missing Rate Limiting on Public Authentication Routes | CWE-307 | **MEDIUM** | `/api/auth/sync-login`, `/api/devices/enroll` | **ACTIVE** |
| **WEB-07** | Hardcoded Client Firebase API Key Fallback | CWE-798 | **LOW** | `src/app/api/auth/sync-login/route.js` & `.env.local.example` | **ACTIVE** |
| **WEB-08** | Potential XSS / Unescaped Dynamic DOM Injection | CWE-79 | **LOW** | `src/components/messages/ConversationList.jsx` | **ACTIVE** |

---

## 2. Detailed Technical Vulnerability Analysis

### WEB-01: Unsigned JWT Signature Bypass via Fallback Decoder
- **Severity:** **CRITICAL (CVSS 9.8)**
- **File Reference:** [secureApiHandler.js](file:///c:/Users/mj/OneDrive/Desktop/SEALTHAPPDASHBOARD/src/lib/api/secureApiHandler.js#L66-L86) and [verify-session/route.js](file:///c:/Users/mj/OneDrive/Desktop/SEALTHAPPDASHBOARD/src/app/api/auth/verify-session/route.js#L18-L49)
- **Root Cause:**
  When a Bearer token is provided in the `Authorization` header, the handler attempts verification via `adminAuth.verifyIdToken(token, true)`. If verification fails, the error is caught, and the code falls back to parsing the raw base64 payload without cryptographic signature verification:
  ```javascript
  if (!decoded && typeof token === "string" && token.includes(".")) {
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    if (payload.exp && payload.exp * 1000 > Date.now()) {
      decoded = payload;
    }
  }
  ```
  An attacker can generate an unsigned JWT containing `{"email": "farazshah9095@gmail.com", "role": "super_admin", "exp": 9999999999}` and gain full Super Administrator access to all protected API routes.
- **Recommended Remediation:**
  Remove lines 75–86 in `secureApiHandler.js`. If `adminAuth.verifyIdToken()` fails, return `401 Unauthorized` immediately.

---

### WEB-02: Static Session Cookie Prefix Impersonation Bypass
- **Severity:** **CRITICAL (CVSS 9.8)**
- **File Reference:** [secureApiHandler.js](file:///c:/Users/mj/OneDrive/Desktop/SEALTHAPPDASHBOARD/src/lib/api/secureApiHandler.js#L113-L116)
- **Root Cause:**
  ```javascript
  } else if (sessionCookie && sessionCookie.startsWith("sess_")) {
    authenticatedUser = { email: process.env.MASTER_ADMIN_EMAIL || "admin@internal", role: ROLES.SUPER_ADMIN };
  }
  ```
  Any client sending `Cookie: admin_session=sess_spoof` satisfies the condition and is granted unverified Super Admin rights without signature or session store validation.
- **Recommended Remediation:**
  Verify cookies cryptographically with `adminAuth.verifySessionCookie(sessionCookie, true)` or HMAC signature verification.

---

### WEB-03: Unauthenticated Device Enrollment Token Minting
- **Severity:** **HIGH (CVSS 8.2)**
- **File Reference:** [generate-token/route.js](file:///c:/Users/mj/OneDrive/Desktop/SEALTHAPPDASHBOARD/src/app/api/devices/generate-token/route.js#L5-L38)
- **Root Cause:**
  The `POST /api/devices/generate-token` endpoint creates and registers valid enrollment tokens directly in Cloud Firestore without requiring any authentication or administrative session.
- **Recommended Remediation:**
  Wrap this route with `secureApiHandler({ requiredRole: 'admin' })`.

---

### WEB-04: Unauthenticated Write Permitted on `notifications_log`
- **Severity:** **HIGH (CVSS 7.5)**
- **File Reference:** [database.rules.json](file:///c:/Users/mj/OneDrive/Desktop/SEALTHAPPDASHBOARD/database.rules.json#L9-L13)
- **Root Cause:**
  ```json
  "$message_id": {
    ".write": "!data.exists() && newData.exists()",
    ".validate": "..."
  }
  ```
  The rule lacks `auth != null`. Anyone on the public internet can send unauthenticated HTTP `PUT` requests to inject data and cause quota exhaustion.
- **Recommended Remediation:**
  Enforce authentication: `".write": "auth != null && auth.uid === $device_id && !data.exists() && newData.exists()"`.

---

### WEB-05: Broad Write Access on `admin_config` and `audit_logs`
- **Severity:** **MEDIUM (CVSS 6.5)**
- **File Reference:** [database.rules.json](file:///c:/Users/mj/OneDrive/Desktop/SEALTHAPPDASHBOARD/database.rules.json#L15-L22)
- **Root Cause:**
  Both nodes have `.write: "auth != null"`. A compromised device token or non-admin user can tamper with configuration or erase audit logs.
- **Recommended Remediation:**
  Restrict writes to admin: `".write": "auth != null && (auth.token.role === 'admin' || auth.token.role === 'super_admin' || auth.token.admin === true)"`.

---

### WEB-06: Missing Rate Limiting on Public Authentication Routes
- **Severity:** **MEDIUM (CVSS 5.3)**
- **File Reference:** `/api/auth/sync-login`, `/api/devices/enroll`
- **Root Cause:**
  Endpoints lack IP-based or token-bucket rate limiting, allowing automated password spray or token brute force attacks.
- **Recommended Remediation:**
  Integrate the existing `rateLimiter.js` utility in `sync-login` and `enroll` routes.

---

### WEB-07: Hardcoded Client Firebase API Key Fallback
- **Severity:** **LOW (CVSS 3.5)**
- **File Reference:** [sync-login/route.js](file:///c:/Users/mj/OneDrive/Desktop/SEALTHAPPDASHBOARD/src/app/api/auth/sync-login/route.js#L25)
- **Root Cause:**
  `const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDTu7M6XTpc9juwzZ-Z7bLEQR2sljbkOhQ";` contains a hardcoded fallback string.
- **Recommended Remediation:**
  Ensure the API key is strictly read from environment variables without hardcoded fallbacks.

---

## 3. Web Dashboard Security Action Checklist

- [ ] Remove unverified JWT fallback from `secureApiHandler.js`.
- [ ] Remove `sessionCookie.startsWith("sess_")` bypass from `secureApiHandler.js`.
- [ ] Add `secureApiHandler({ requiredRole: 'admin' })` to `/api/devices/generate-token`.
- [ ] Harden `database.rules.json` to require device authentication on `notifications_log`.
- [ ] Restrict `admin_config` and `audit_logs` writes to `super_admin` in RTDB.
