# 🛡️ Firebase App Distributor & Android Application Cybersecurity Audit Report

> **Auditor Persona:** CodeRabbit Security Reviewer & Enterprise Vulnerability Assessor  
> **Target Scope:** Android Application Client, Firebase Realtime Database Distribution Nodes, OTA Telemetry, and Web Dashboard Endpoints  
> **Mode:** Strict Read-Only Audit (No Code Alterations Applied)  
> **Status:** Completed

---

## Executive Summary

A thorough, end-to-end security inspection was performed across the **Android App Client**, **Firebase Realtime Database (RTDB) Distribution Nodes (`/app_update` & `/app_update_staging`)**, **OTA Update Handlers**, and the **Next.js Web Dashboard**.

While the application features sophisticated zero-persistence browser cryptography (Web Crypto API) and single-use cloud invite tokens on the web side, the **Android client and Firebase distribution pipeline present multiple critical security vulnerabilities** — including **hardcoded master encryption keys in client source code**, **omitted Realtime Database security rules creating supply-chain hijack exposure**, and **unvalidated download link execution vectors**.

---

## 🔍 Vulnerability Severity Matrix

| ID | Title / Vulnerability | Component | Severity | CWE |
| :--- | :--- | :--- | :--- | :--- |
| **VULN-01** | Hardcoded Master AES-256 Key & Salt in Client Source | Android Client (`scripts/`) | 🚨 **CRITICAL** | CWE-798, CWE-321 |
| **VULN-02** | Omitted RTDB Security Rules for `/app_update` Nodes | Firebase RTDB (`database.rules.json`) | 🚨 **CRITICAL** | CWE-284, CWE-494 |
| **VULN-03** | Lack of Cryptographic Digest (SHA-256) on APK Updates | Distribution Payload (`useAppUpdate.js`) | ⚠️ **HIGH** | CWE-353 |
| **VULN-04** | Unsanitized `apk_url` Protocol (Potential DOM XSS) | Dashboard View (`app-updates/page.jsx`) | ⚠️ **HIGH** | CWE-79, CWE-601 |
| **VULN-05** | Unauthenticated Public Access to `/api/app-update` | Route Handler (`src/app/api/app-update`) | 🟡 **MEDIUM** | CWE-306 |
| **VULN-06** | Permissive CSP with `'unsafe-eval'` & `'unsafe-inline'` | Security Middleware (`middleware.js`) | 🟡 **MEDIUM** | CWE-1021 |
| **VULN-07** | Silent Error Suppression on Database Permission Failures | React Hook (`useAppUpdate.js`) | ℹ️ **LOW / BUG** | CWE-390 |

---

## 🚨 Detailed Findings & Vulnerability Analysis

### VULN-01: Hardcoded Master AES-256 Key & Salt in Client Source
- **Severity:** 🚨 **CRITICAL** (CVSS: 9.8)
- **Affected File:** `scripts/AndroidEncryptionService.java` (Line 23) & `scripts/AndroidCryptoProof.java` (Line 14–15)
- **Technical Analysis:**
  ```java
  // In AndroidEncryptionService.java
  private static final String MASTER_AES_KEY_BASE64 = "SR+ZH/q+LNRYEXCR4BiZNhgsNQCUbFJ9YXu3i7/36BE=";
  
  // In AndroidCryptoProof.java
  private static final String MASTER_PASSPHRASE = "StealthAdminSuperMasterPassphrase2026!";
  private static final String MASTER_SALT = "StealthAppMasterSalt2026";
  ```
- **Attack Vector & Impact:**
  Any Android APK built with this code and distributed to user devices can be decompiled in seconds using standard reverse-engineering utilities (`jadx`, `apktool`). An attacker extracting this symmetric key can:
  1. Decrypt all encrypted notification payloads intercepted from any user's device.
  2. Forge valid encrypted telemetry and inject fraudulent notifications into the database.
- **Remediation Recommendation:**
  - Transition to an asymmetric public-key architecture (e.g. Android client encrypts using an ephemeral ECDH or RSA-OAEP public key; only the admin dashboard holds the private key).
  - Never embed symmetric master keys inside client APK binaries.

---

### VULN-02: Missing RTDB Security Rules for `/app_update` Nodes (Supply-Chain Risk)
- **Severity:** 🚨 **CRITICAL** (CVSS: 9.1)
- **Affected File:** `database.rules.json` (Lines 1–24)
- **Technical Analysis:**
  The `database.rules.json` configuration defines rules for `notifications_log`, `audit_logs`, and `admin_config`, but completely omits rules for:
  - `/app_update` (Production)
  - `/app_update_staging` (Staging)
- **Attack Vector & Impact:**
  - **Case A (Locked Default):** Because root has `".read": false, ".write": false`, unauthenticated Android devices checking for updates receive HTTP 401 Permission Denied.
  - **Case B (Permissive Cloud Rules):** If cloud rules default to open or lack write validation, any unauthorized external actor can execute a **Supply-Chain Poisoning Attack** by writing a rogue APK URL to `/app_update/apk_url` and setting `force_update: true`. All connected Android clients will be prompted or forced to download malware or ransomware.
- **Remediation Recommendation:**
  Add strict declarative rules in `database.rules.json`:
  ```json
  "app_update": {
    ".read": true,
    ".write": "auth != null && auth.token.admin === true"
  },
  "app_update_staging": {
    ".read": "auth != null",
    ".write": "auth != null && auth.token.admin === true"
  }
  ```

---

### VULN-03: Lack of Cryptographic Integrity Verification (SHA-256 Hash / Signature)
- **Severity:** ⚠️ **HIGH** (CVSS: 7.5)
- **Affected Files:** `src/hooks/useAppUpdate.js`, `src/app/dashboard/app-updates/page.jsx`
- **Technical Analysis:**
  The update schema only records:
  ```json
  {
    "apk_url": "...",
    "version_code": 1,
    "version_name": "1.0",
    "title": "...",
    "message": "...",
    "force_update": false
  }
  ```
  It lacks a mandatory `sha256_checksum` or `apk_signature_digest`.
- **Attack Vector & Impact:**
  If the hosting server, CDN bucket, or download link is compromised, or if a Man-in-the-Middle (MitM) intercepts the transmission, the Android device or administrator installs a tampered APK without any cryptographic verification.
- **Remediation Recommendation:**
  Require an immutable `sha256` hash in the telemetry schema. Before initiating installation, the Android Package Installer or downloader must verify the byte digest against the signed hash.

---

### VULN-04: Unsanitized `apk_url` Protocol in Dashboard (Potential DOM XSS)
- **Severity:** ⚠️ **HIGH** (CVSS: 7.2)
- **Affected File:** `src/app/dashboard/app-updates/page.jsx` (Lines 214–222, 519–531)
- **Technical Analysis:**
  The dashboard directly sets:
  ```jsx
  <a href={production.apk_url} target="_blank" rel="noreferrer">Download APK</a>
  <a href={previewData.apk_url || "#"} target="_blank" rel="noreferrer">Download & Install APK</a>
  ```
- **Attack Vector & Impact:**
  If an attacker compromises the RTDB record and populates `apk_url` with a `javascript:` pseudoprotocol (e.g. `javascript:/* malicious payload */`), an administrator clicking the link in the web dashboard will trigger script execution in the context of the authenticated dashboard session.
- **Remediation Recommendation:**
  Validate that `apk_url` strictly begins with `https://` before rendering clickable links.

---

### VULN-05: Unauthenticated Public API Route for App Updates
- **Severity:** 🟡 **MEDIUM** (CVSS: 5.3)
- **Affected File:** `src/app/api/app-update/route.js` (Lines 8–37) & `src/middleware.js`
- **Technical Analysis:**
  The `GET` handler in `src/app/api/app-update/route.js` fetches and returns production and staging configuration data without requiring authentication tokens or session validation. `middleware.js` protects `/dashboard/*` but exempts `/api/app-update`.
- **Attack Vector & Impact:**
  Unauthenticated external parties can probe internal staging build numbers, server URLs, and update telemetry, assisting reconnaissance for targeted attacks.
- **Remediation Recommendation:**
  Verify admin session authentication in `route.js` or require an API bearer token.

---

### VULN-06: Permissive Content-Security-Policy (CSP)
- **Severity:** 🟡 **MEDIUM** (CVSS: 4.8)
- **Affected File:** `src/middleware.js` (Lines 74–86)
- **Technical Analysis:**
  ```javascript
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  ```
- **Attack Vector & Impact:**
  `'unsafe-eval'` and `'unsafe-inline'` weaken XSS defenses. If an injection vector exists in rendered message logs or external URLs, the CSP will not block inline script execution.
- **Remediation Recommendation:**
  Adopt nonce-based CSP for production builds and eliminate `'unsafe-eval'`.

---

### VULN-07: Silent Error Suppression in React Hook
- **Severity:** ℹ️ **LOW / BUG** (Functional / Availability)
- **Affected File:** `src/hooks/useAppUpdate.js` (Lines 52–75)
- **Technical Analysis:**
  When Firebase returns `{ "error": "Permission denied" }`, the conditional `if (!prodData.error)` ignores the payload and calls `setLoading(false)` without setting `error`.
- **Impact:**
  The dashboard displays fallback values (`1.0`, `Android System Safety Core`) and does not inform the administrator that the Firebase connection was rejected.
- **Remediation Recommendation:**
  Set `setError(prodData.error)` so the UI surfaces an alert banner when database access fails.

---

## 📋 Hardening Roadmap (Recommended Actions)

1. **Client Cryptography:** Replace the static symmetric `MASTER_AES_KEY` with an asymmetric keypair or Android Keystore-backed key derivation.
2. **RTDB Rules:** Deploy the locked down `app_update` and `app_update_staging` rules in `database.rules.json` to prevent rogue update tampering.
3. **Binary Integrity:** Include `sha256_hash` in all distribution releases and enforce checksum verification before APK installation.
4. **URL Sanitation:** Enforce `https://` validation on all external links in the web dashboard.
5. **Route Protection:** Protect `/api/app-update` under administrative session validation.
