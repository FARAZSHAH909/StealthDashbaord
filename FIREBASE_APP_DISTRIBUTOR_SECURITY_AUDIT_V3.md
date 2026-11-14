# Cybersecurity Audit & Verification Report V3: Firebase App Distributor & Android Core

**Document Reference:** `SEC-AUDIT-V3-20261114`  
**Scope:** Firebase App Distributor, Next.js Admin Dashboard, Firebase RTDB/Firestore Security Rules, and Android Application (`StealthApp`).  
**Audit Type:** Third-Pass Deep-Dive Cybersecurity & Code Verification Re-Audit  
**Status:** **6 NEW RESIDUAL VULNERABILITIES IDENTIFIED** (12 Prior Issues Remediated)  
**Evaluator:** Antigravity AI Security Sentinel & Code Integrity Auditor  

---

## Executive Summary

Following remediation commits in both the Next.js Dashboard repository (`SEALTHAPPDASHBOARD`, commit `0b50951`) and the Android client repository (`StealthApp`, commits `2fe33ad` & `cbf0279`), a full third-pass static and architectural cybersecurity re-audit was performed.

### Key Highlights:
1. **Remediation Verification:** All 12 previously reported vulnerabilities (`VULN-01` through `VULN-12`) have been addressed by the development team. Hardcoded master secrets have been excised from the Android client, RTDB rule syntax has been corrected, and administrative routes have been wrapped in security handlers.
2. **New High/Critical Residual Findings:** During deep tracing of the remediation code, **6 new vulnerabilities** (`VULN-13` through `VULN-18`) were uncovered:
   - A critical signature-bypass flaw in `secureApiHandler.js` and `verify-session/route.js` that catches failed JWT verifications and falls back to decoding unverified base64 claims.
   - An unauthenticated session cookie check where any cookie starting with `sess_` grants instant `super_admin` privileges.
   - An unauthenticated token generation API (`/api/devices/generate-token`) allowing unauthorized enrollment token minting.
   - Missing write authentication on Realtime Database `notifications_log`.
   - Public debug keystore usage for the release APK signing configuration.
   - CI/CD automated deployment failure where GitHub Actions curl requests lack authentication to write to secured RTDB nodes.

---

## Part 1: Status of Previously Reported Findings (V1 & V2)

| Vulnerability ID | Description | Severity | Prior Status | V3 Audit Result | Remediation Evidence |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **VULN-01** | RTDB Rules Syntax Error (`.beginsWith()`) | **CRITICAL** | Broken (V2) | **RESOLVED** | `database.rules.json`: Replaced invalid `.beginsWith()` with valid RTDB regex `.matches(/^https:\/\/./)`. |
| **VULN-02** | Public/Any-Auth Write on `app_update` Node | **CRITICAL** | Partial (V2) | **RESOLVED** | `database.rules.json`: Restricted `.write` strictly to `auth.token.role === 'super_admin' \|\| auth.token.admin === true`. |
| **VULN-03** | Staging Channel Exposure to Modification | **HIGH** | Open (V1) | **RESOLVED** | `database.rules.json`: `app_update_staging` `.read` and `.write` restricted to `super_admin`/`admin`. |
| **VULN-04** | Android Updater Missing SHA-256 & Identity Check | **HIGH** | Open (V1) | **RESOLVED** | `StealthApp`: Added package name check, version code verification, and SHA-256 integrity validation in `UpdateDownloadService.java`. |
| **VULN-05** | Hardcoded Master Key & Passphrase in Android App | **CRITICAL** | Open (V2) | **RESOLVED** | `StealthApp`: Excised `MASTER_PASSPHRASE` and `MASTER_AES_KEY_BASE64` from `KeyEnrollmentHelper.java`. Replaced with Keystore KEK. |
| **VULN-06** | Unauthenticated Vault Overwrite Route | **CRITICAL** | Open (V2) | **RESOLVED** | `src/app/api/admin/vault-update/route.js`: Wrapped with `secureApiHandler({ requiredRole: 'super_admin' })`. |
| **VULN-07** | Unauthenticated Admin Approvals API | **HIGH** | Open (V2) | **RESOLVED** | `src/app/api/admin/approvals/route.js`: Wrapped with `secureApiHandler({ requiredRole: 'super_admin' })`. |
| **VULN-08** | Cryptographic Bypass in App-Update API | **HIGH** | Open (V2) | **RESOLVED** | `src/app/api/app-update/route.js`: Removed unverified cookie check; wrapped with `secureApiHandler({ requiredRole: 'admin' })`. |
| **VULN-09** | Predictable Fallback Signing Key for Device Tokens | **HIGH** | Open (V2) | **RESOLVED** | `src/app/api/devices/auth-token/route.js`: Replaced `NEXT_PUBLIC_FIREBASE_API_KEY` with private server-side secret `FALLBACK_HMAC_SECRET`. |
| **VULN-10** | Admin Users API Auth Error Fallthrough | **HIGH** | Open (V2) | **RESOLVED** | `src/app/api/admin/users/route.js`: Explicit 401 rejection on token verification failure. |
| **VULN-11** | OTP Leakage in Registration Response | **MEDIUM** | Open (V2) | **RESOLVED** | `src/app/api/auth/enroll/route.js`: Removed `devOtpHint` from API JSON response. |
| **VULN-12** | Hardcoded Master Key Fallback in Vault Route | **CRITICAL** | Open (V2) | **RESOLVED** | `src/app/api/v1/vault/key/route.js`: Hardcoded fallback key excised; returns 503 if credentials missing; restricted to `super_admin`. |

---

## Part 2: New Vulnerability Findings (VULN-13 to VULN-18)

### VULN-13: Cryptographic Signature Verification Bypass via Unsigned JWT Fallback
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity), CWE-287 (Improper Authentication)
- **Severity:** **CRITICAL (CVSS 9.8)**
- **Affected Files:**
  - `src/lib/api/secureApiHandler.js` (lines 66–86)
  - `src/app/api/auth/verify-session/route.js` (lines 18–49)
- **Vulnerability Analysis:**
  When a Bearer token is supplied, `secureApiHandler` calls `adminAuth.verifyIdToken(token, true)`. If verification throws an error (e.g., token was fabricated or signed with an arbitrary key), the `catch` block merely logs a warning. Control flow then falls through to:
  ```javascript
  // Fallback: parse unexpired JWT payload
  if (!decoded && typeof token === "string" && token.includes(".")) {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          decoded = payload;
        }
      }
    } catch (e) {}
  }
  ```
  If `payload.email` matches `process.env.MASTER_ADMIN_EMAIL` (`farazshah9095@gmail.com`) or `role === 'super_admin'`, access is immediately granted as Super Administrator.
- **Proof-of-Concept Vector:**
  An attacker transmits a crafted Bearer header:
  `Bearer eyJhbGciOiJub25lIn0.eyJlbWFpbCI6ImZhcmF6c2hhaDkwOTVAZ21haWwuY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoyNTMzMzA0NDgwMH0.`
  The Admin SDK fails verification, the exception is swallowed, the payload is decoded, and full Super-Admin API access is unlocked.
- **Remediation Recommendation:**
  Remove the unverified JWT base64 fallback entirely. If `adminAuth.verifyIdToken` fails, immediately return `401 Unauthorized`.

---

### VULN-14: Static Session Cookie Prefix Impersonation Bypass
- **CWE:** CWE-287 (Improper Authentication), CWE-384 (Session Fixation)
- **Severity:** **CRITICAL (CVSS 9.8)**
- **Affected File:**
  - `src/lib/api/secureApiHandler.js` (lines 113–116)
- **Vulnerability Analysis:**
  The session cookie authentication check evaluates:
  ```javascript
  } else if (sessionCookie && sessionCookie.startsWith("sess_")) {
    // Internal session cookie recognized
    authenticatedUser = { email: process.env.MASTER_ADMIN_EMAIL || "admin@internal", role: ROLES.SUPER_ADMIN };
  }
  ```
  Any HTTP request with header `Cookie: admin_session=sess_spoof` or `Cookie: __Secure-AdminSession=sess_anything` satisfies `.startsWith("sess_")`. It requires zero cryptographic signature, no secret matching, and no database lookup.
- **Remediation Recommendation:**
  Validate session cookies using `adminAuth.verifySessionCookie(sessionCookie, true)` or an HMAC signature with `COOKIE_ENCRYPTION_KEY`. Never trust raw client cookie prefixes.

---

### VULN-15: Unauthenticated Device Enrollment Token Minting
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **Severity:** **HIGH (CVSS 8.2)**
- **Affected File:**
  - `src/app/api/devices/generate-token/route.js` (lines 5–38)
- **Vulnerability Analysis:**
  The `POST /api/devices/generate-token` endpoint generates an active device enrollment token in Cloud Firestore without requiring any authentication, administrative token, or invite secret.
  An unauthenticated attacker can query this endpoint, acquire a valid enrollment token, and subsequently call `POST /api/devices/enroll` to register unauthorized devices into `devices_management`.
- **Remediation Recommendation:**
  Wrap `src/app/api/devices/generate-token/route.js` in `secureApiHandler({ requiredRole: 'admin' })` or require a valid admin authorization token before generating enrollment tokens.

---

### VULN-16: Unauthenticated Write Access on RTDB `notifications_log`
- **CWE:** CWE-284 (Improper Access Control), CWE-400 (Uncontrolled Resource Consumption)
- **Severity:** **HIGH (CVSS 7.5)**
- **Affected File:**
  - `database.rules.json` (lines 9–13)
- **Vulnerability Analysis:**
  ```json
  "notifications_log": {
    ".read": "auth != null",
    "$device_id": {
      "$message_id": {
        ".write": "!data.exists() && newData.exists()",
        ".validate": "..."
      }
    }
  }
  ```
  The write rule enforces append-only semantics (`!data.exists() && newData.exists()`), but **completely omits authentication** (`auth != null`). Anyone on the public internet can send HTTP REST `PUT` requests to inject arbitrary encrypted payloads, spoofing notifications and exhausting database storage quotas.
- **Remediation Recommendation:**
  Enforce authentication on write:
  ```json
  ".write": "auth != null && auth.uid === $device_id && !data.exists() && newData.exists()"
  ```
  Update `FirebaseHelper.java` to authenticate its HTTP REST requests using the minted custom token.

---

### VULN-17: Weak Role Restrictions on RTDB `admin_config` and `audit_logs`
- **CWE:** CWE-284 (Improper Access Control)
- **Severity:** **MEDIUM (CVSS 6.5)**
- **Affected File:**
  - `database.rules.json` (lines 15–22)
- **Vulnerability Analysis:**
  ```json
  "audit_logs": {
    ".read": "auth != null",
    ".write": "auth != null"
  },
  "admin_config": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
  ```
  Any authenticated Firebase token—including client device tokens or anonymous users—has `auth != null`. This grants untrusted Android devices the ability to read and write administrative configurations and alter or overwrite audit logs.
- **Remediation Recommendation:**
  Restrict write access to administrators:
  ```json
  ".write": "auth != null && (auth.token.role === 'admin' || auth.token.role === 'super_admin' || auth.token.admin === true)"
  ```

---

### VULN-18: Android Release APK Signed with Debug Keystore & No Obfuscation
- **CWE:** CWE-326 (Inadequate Encryption Strength), CWE-494 (Download of Code Without Integrity Check)
- **Severity:** **MEDIUM (CVSS 5.5)**
- **Affected File:**
  - `StealthApp/app/build.gradle` (lines 24–33, 52–58)
- **Vulnerability Analysis:**
  The `release` build type uses `debug.keystore` with default credentials (`storePassword 'android'`, `keyPassword 'android'`) committed to the public Git repository. Anyone with access to the repository can sign malicious binaries with the identical signature. In addition, `minifyEnabled false` leaves the application un-obfuscated.
- **Remediation Recommendation:**
  1. Generate a dedicated private release keystore stored securely in GitHub Secrets.
  2. Enable R8/ProGuard code shrinking and obfuscation (`minifyEnabled true`) in release builds.

---

### VULN-19: CI/CD Pipeline Automation Failure on Hardened RTDB Rules
- **CWE:** Operational Availability / CI-CD Failure
- **Severity:** **MEDIUM (CVSS 5.3)**
- **Affected Files:**
  - `StealthApp/.github/workflows/release_update.yml` (lines 139–150)
  - `StealthApp/.github/workflows/staging_test.yml` (lines 79–90)
- **Vulnerability Analysis:**
  The GitHub Actions workflow executes an unauthenticated `curl -s -X PATCH` against `https://stealthapp-50da2-default-rtdb.firebaseio.com/app_update.json`.
  Once `database.rules.json` (which requires `auth != null && (auth.token.role === 'super_admin' || auth.token.admin === true)`) is deployed to the live Firebase instance, Firebase will reject these automated updates with `401 Unauthorized`, causing the auto-update deployment to fail. Furthermore, the workflow does not compute or publish `sha256_hash`, causing Android clients to skip SHA-256 integrity validation.
- **Remediation Recommendation:**
  Pass a Firebase Database Secret or OAuth Bearer token in the GitHub Actions `curl` command:
  ```bash
  curl -s -X PATCH "https://stealthapp-50da2-default-rtdb.firebaseio.com/app_update.json?auth=${{ secrets.FIREBASE_DB_SECRET }}" ...
  ```
  Compute and include the SHA-256 checksum in the update payload.

---

## Part 3: Architecture Risk Matrix

```
+-------------------------------------------------------------------------+
|                  VULNERABILITY SURFACE BY COMPONENT                     |
+-------------------------------------------------------------------------+
| Component                | Remediated | Residual Open | Risk Level      |
+--------------------------+------------+---------------+-----------------+
| Next.js API Middleware   | 4          | 2 (V13, V14)  | CRITICAL        |
| Device Management APIs   | 2          | 1 (V15)       | HIGH            |
| Firebase RTDB Rules      | 3          | 2 (V16, V17)  | HIGH            |
| Android App Code         | 2          | 1 (V18)       | MEDIUM          |
| GitHub Actions Pipelines | 1          | 1 (V19)       | MEDIUM          |
+--------------------------+------------+---------------+-----------------+
```

---

## Action Plan for Immediate Remediation

1. **Fix `src/lib/api/secureApiHandler.js`:**
   - Delete lines 75–86 (fallback base64 unverified JWT parsing).
   - Delete line 113 (`sessionCookie.startsWith("sess_")`). Replace with cryptographic session verification.
2. **Protect `src/app/api/devices/generate-token/route.js`:**
   - Wrap the handler with `secureApiHandler({ requiredRole: "admin" })`.
3. **Harden `database.rules.json`:**
   - Add `auth != null && auth.uid === $device_id` to `notifications_log.$device_id.$message_id`.
   - Restrict `admin_config` and `audit_logs` writes to admin/super_admin.
4. **Update GitHub Actions Workflow:**
   - Add `?auth=${{ secrets.FIREBASE_DB_SECRET }}` to `release_update.yml` and compute `sha256_hash`.
5. **Secure Android Release Keystore:**
   - Migrate release signing from `debug.keystore` to an encrypted GitHub Secret.
