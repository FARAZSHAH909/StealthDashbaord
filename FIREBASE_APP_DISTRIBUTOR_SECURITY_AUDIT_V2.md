# 🛡️ Comprehensive Cybersecurity Audit & Verification Report (V2)
### Target: Stealth Admin Dashboard & Firebase App Distributor / Android Client

> **Auditor:** CodeRabbit Deep Security Assessor  
> **Evaluation Mode:** Strict Read-Only Audit (No Code Alterations)  
> **Audit Version:** 2.0 (Post-Remediation Verification & Full Scope Inspection)  
> **Timestamp:** November 14, 2026

---

## Executive Summary

Following the remediation commit (`8075b78`), a rigorous, end-to-end re-audit of the entire codebase was conducted across two primary domains:
1. **The Web Dashboard & Server APIs** (`src/app/api/**`, `src/app/dashboard/**`, `src/middleware.js`, `src/hooks/**`)
2. **The Firebase App Distributor & Android Client Architecture** (`database.rules.json`, `firestore.rules`, `scripts/*.java`)

### Key Takeaways:
- **Verified Remediations:** Significant progress was made. DOM XSS protection (`sanitizeApkUrl`), production CSP hardening, and UI error propagation have been successfully implemented.
- **Critical New & Residual Findings:** 
  1. A **syntax error in `database.rules.json`** (`.beginsWith()`) will cause Firebase Realtime Database rule compilation or execution failures.
  2. Overly permissive write rules (`.write: "auth != null"`) still allow any authenticated non-admin user to overwrite APK update payloads.
  3. Multiple administrative endpoints (`/api/admin/vault-update`, `/api/admin/approvals`) lack server-side authentication verification, enabling privilege escalation.
  4. The `/api/app-update` route uses a **pseudo-auth presence check** without cryptographic signature verification.
  5. The device token fallback in `/api/devices/auth-token` uses the **public client API key** as an HMAC secret.

---

## 📊 Comprehensive Vulnerability Scorecard

| ID | Issue Description | Component | Severity | Remediation Status |
| :--- | :--- | :--- | :--- | :--- |
| **VULN-01** | Hardcoded Master AES-256 Key & Passphrase | Android Scripts & Vault API | 🚨 **CRITICAL** | 🟡 Partial (Removed in Java; still fallback in `/api/v1/vault/key`) |
| **VULN-02** | Invalid RTDB Rule Syntax (`.beginsWith`) & Broad `.write` | Firebase RTDB (`database.rules.json`) | 🚨 **CRITICAL** | ❌ Broken Syntax + Weak Auth (`auth != null`) |
| **VULN-03** | Lack of Enforced APK SHA-256 Validation on Device | Distribution Pipeline & Android Client | ⚠️ **HIGH** | 🟡 Partial (Added to dashboard UI; unenforced on device) |
| **VULN-04** | Unsanitized `apk_url` Protocol (DOM XSS / Open Redirect) | Dashboard View (`app-updates/page.jsx`) | ⚠️ **HIGH** | ✅ **VERIFIED RESOLVED** (`sanitizeApkUrl`) |
| **VULN-05** | Pseudo-Authentication Check (No Cryptographic Verification) | Route Handler (`src/app/api/app-update`) | ⚠️ **HIGH** | ❌ Defective (`!cookie && !token` existence only) |
| **VULN-06** | Permissive CSP with `'unsafe-eval'` | Security Middleware (`middleware.js`) | 🟡 **MEDIUM** | ✅ **VERIFIED RESOLVED** (Restricted in production) |
| **VULN-07** | Silent Error Suppression in RTDB Hook | React Hook (`useAppUpdate.js`) | ℹ️ **LOW** | ✅ **VERIFIED RESOLVED** (`setError` active) |
| **VULN-08** | Unauthenticated Overwrite of Master Private Vault | Route Handler (`src/app/api/admin/vault-update`) | 🚨 **CRITICAL** | ❌ **NEW FINDING** (No auth check) |
| **VULN-09** | Unauthenticated Approval of Admin Candidates | Route Handler (`src/app/api/admin/approvals`) | 🚨 **CRITICAL** | ❌ **NEW FINDING** (No auth check) |
| **VULN-10** | Device Token Minting with Public Client API Key Secret | Route Handler (`src/app/api/devices/auth-token`) | 🚨 **CRITICAL** | ❌ **NEW FINDING** (HMAC using public key) |
| **VULN-11** | Auth Bypass Fallthrough Exposing Full Admin Directory | Route Handler (`src/app/api/admin/users`) | ⚠️ **HIGH** | ❌ **NEW FINDING** (Catches error, leaks Firestore users) |
| **VULN-12** | Master Email OTP Verification Code Leaked in Response | Route Handler (`src/app/api/auth/enroll`) | ⚠️ **HIGH** | ❌ **NEW FINDING** (`devOtpHint` exposed) |

---

## 🔍 Detailed Vulnerability Breakdown

### 1. VULN-02: Invalid RTDB Rule Syntax & Weak Write Authorization
- **Location:** `database.rules.json` (Lines 23–32)
- **Current Code:**
  ```json
  "app_update": {
    ".read": true,
    ".write": "auth != null",
    ".validate": "newData.hasChildren(['version_code', 'version_name', 'apk_url']) && newData.child('apk_url').isString() && newData.child('apk_url').val().beginsWith('https://') && newData.child('version_code').isNumber()"
  }
  ```
- **Flaws Identified:**
  1. **Syntax Failure:** `.beginsWith()` is a Cloud Firestore CEL method. Firebase Realtime Database does **not** support `.beginsWith()`. Rules will fail validation or reject all write operations.
  2. **Authorization Hole:** `.write: "auth != null"` allows *any* user authenticated via Firebase (including low-privilege users or compromised device accounts) to overwrite production release binaries.
  3. **Information Disclosure:** `app_update_staging` has `.read: true`, exposing internal QA/staging builds to unauthenticated internet scrapers.
- **Remedy:**
  ```json
  "app_update": {
    ".read": true,
    ".write": "auth != null && (auth.token.role === 'super_admin' || auth.token.admin === true)",
    ".validate": "newData.hasChildren(['version_code', 'version_name', 'apk_url']) && newData.child('apk_url').isString() && newData.child('apk_url').val().matches(/^https:\\/\\/.+/) && newData.child('version_code').isNumber()"
  },
  "app_update_staging": {
    ".read": "auth != null && (auth.token.role === 'super_admin' || auth.token.admin === true)",
    ".write": "auth != null && (auth.token.role === 'super_admin' || auth.token.admin === true)",
    ".validate": "newData.hasChildren(['version_code', 'version_name', 'apk_url']) && newData.child('apk_url').isString() && newData.child('apk_url').val().matches(/^https:\\/\\/.+/) && newData.child('version_code').isNumber()"
  }
  ```

---

### 2. VULN-05: Pseudo-Authentication on `/api/app-update`
- **Location:** `src/app/api/app-update/route.js` (Lines 12–22)
- **Current Code:**
  ```javascript
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__Secure-AdminSession")?.value || cookieStore.get("admin_session")?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : null;

  if (!sessionCookie && !bearerToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  ```
- **Flaw Identified:**
  The handler performs a simple existence check (`!sessionCookie && !bearerToken`). It **never validates or decodes** the token using `adminAuth.verifySessionCookie` or `adminAuth.verifyIdToken`.
- **Attack Vector:**
  Any unauthenticated client sending `Cookie: admin_session=test` or `Authorization: Bearer test` completely bypasses this check.
- **Remedy:** Wrap with `secureApiHandler` or invoke `adminAuth.verifySessionCookie(sessionCookie, true)` / `adminAuth.verifyIdToken(bearerToken, true)`.

---

### 3. VULN-08 & VULN-09: Unprotected Critical Administrative Routes
- **Locations:**
  - `src/app/api/admin/vault-update/route.js`
  - `src/app/api/admin/approvals/route.js`
- **Flaws Identified:**
  - `vault-update` accepts `POST` requests and writes `updatedVaultDoc` straight to `system_security/master_private_vault` with **zero authentication or role check**.
  - `approvals` accepts `POST` requests and immediately executes `approveSecondaryApplicant(requestId)` without checking who initiated the request.
  - While `middleware.js` checks for `admin_session`, it only checks cookie presence (`!!sessionCookie`), allowing forged cookies to bypass middleware into these unprotected handlers.
- **Remedy:** Enforce `secureApiHandler({ requiredRole: 'super_admin', ... })` on both routes.

---

### 4. VULN-10: Insecure Fallback Token Minting in `/api/devices/auth-token`
- **Location:** `src/app/api/devices/auth-token/route.js` (Lines 81–88)
- **Current Code:**
  ```javascript
  const tokenPayload = JSON.stringify({ uid: device_id, role: "device", exp: now + 3600000 });
  const hmac = crypto.createHmac("sha256", process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "stealth-key")
    .update(tokenPayload)
    .digest("base64url");
  customToken = `dev_tok_${Buffer.from(tokenPayload).toString("base64url")}.${hmac}`;
  ```
- **Flaw Identified:**
  The server signs fallback authentication tokens using `process.env.NEXT_PUBLIC_FIREBASE_API_KEY`. Because `NEXT_PUBLIC_*` variables are bundled into client-side JavaScript, the HMAC secret is public knowledge. Anyone can forge signed device tokens for any `device_id`.
- **Remedy:** Use a dedicated private server-side secret (`DEVICE_TOKEN_SECRET`) that is never prefixed with `NEXT_PUBLIC_`.

---

### 5. VULN-11: Auth Failure Fallthrough in Admin Users Directory
- **Location:** `src/app/api/admin/users/route.js` (Lines 33–36)
- **Current Code:**
  ```javascript
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    ...
  } catch (authErr) {
    console.warn("Falling back to Cloud Firestore admin user registry:", authErr.message);
  }
  // Continues execution and returns Firestore users!
  ```
- **Flaw Identified:**
  When token verification throws an error (invalid/expired/tampered token), the route catches the error and still proceeds to query and return all admin user accounts from Firestore.
- **Remedy:** In the `catch` block, immediately return `401 Unauthorized` instead of falling through.

---

### 6. VULN-12: Master Account OTP Verification Code Leaked in API Response
- **Location:** `src/app/api/auth/enroll/route.js` (Line 33)
- **Current Code:**
  ```javascript
  devOtpHint: enrollment.isMaster ? enrollment.verificationToken : null
  ```
- **Flaw Identified:**
  When enrolling with the master administrator email, the server includes the OTP code (`verificationToken`) in the JSON response payload. If an adversary obtains an invitation token, they can register without possessing access to the master email inbox.
- **Remedy:** Remove `devOtpHint` from production API responses.

---

## 🛡️ Recommended Priority Remediation Plan

1. **Immediate RTDB Fix:** Replace `.beginsWith('https://')` with `.matches(/^https:\\/\\/.+/)` and restrict `.write` to `auth.token.role === 'super_admin'` in `database.rules.json`.
2. **Server Auth Verification:** Replace presence checks in `/api/app-update`, `/api/admin/vault-update`, and `/api/admin/approvals` with cryptographic token verification using `secureApiHandler`.
3. **Secret Isolation:** Disallow using `NEXT_PUBLIC_*` variables for server-side HMAC signatures in `/api/devices/auth-token`.
4. **Remove Dev Leakage:** Strip `devOtpHint` from `/api/auth/enroll/route.js`.
