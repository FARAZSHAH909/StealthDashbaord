# Cybersecurity Deep-Scan Audit Report: Android Core Application

**Target System:** `StealthApp` (Android Safety Core — Java, AndroidKeyStore, Room, SQLCipher, WorkManager, Firebase RTDB Sync)  
**Scan Engine:** MobSFScan v1.1.0 (Mobile Security Framework Engine), Semgrep v1.172.0 (OSS Community Rules)  
**Evaluation Mode:** Strict Read-Only Static Code Analysis (Zero Code Modifications)  
**Report Reference:** `AUDIT-ANDROID-APP-20261114`  

---

## Executive Summary

A comprehensive automated static application security testing (SAST) scan of the Android core application (`StealthApp`) was executed using **MobSFScan** and **Semgrep**.
The analysis verified that prior hardcoded master cryptographic keys have been excised.
However, **8 mobile-specific vulnerabilities and architectural security gaps** were identified across the manifest, activity lifecycle, network sync layer, and build configurations.

---

## 1. Vulnerability Findings Matrix

| Finding ID | Vulnerability Title | CWE / MASVS | Severity | Affected Component / File | Status |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **AND-01** | StrandHogg 2.0 Task Hijacking Vulnerability | CWE-1021 / MASVS-PLATFORM-1 | **HIGH (ERROR)** | `app/src/main/AndroidManifest.xml` (`MainActivity`) | **ACTIVE** |
| **AND-02** | Unauthenticated HTTP REST Push to Firebase RTDB | CWE-306 / MASVS-NETWORK-1 | **MEDIUM** | `app/src/main/java/.../sync/FirebaseHelper.java` | **ACTIVE** |
| **AND-03** | Release APK Signed with Public Debug Keystore | CWE-326 / CWE-494 | **MEDIUM** | `app/build.gradle` (`signingConfigs.permanentSigner`) | **ACTIVE** |
| **AND-04** | Code Obfuscation (R8/ProGuard) Disabled in Release | CWE-656 / MASVS-RESILIENCE-1 | **MEDIUM** | `app/build.gradle` (`minifyEnabled false`) | **ACTIVE** |
| **AND-05** | CI/CD GitHub Actions Workflow Authentication Failure | Operational / CI-CD Breakage | **MEDIUM** | `.github/workflows/release_update.yml` & `staging_test.yml` | **ACTIVE** |
| **AND-06** | Missing Public Key / TLS Certificate Pinning | CWE-295 / MASVS-NETWORK-4 | **LOW (INFO)** | `app/src/main/res/xml/network_security_config.xml` | **ACTIVE** |
| **AND-07** | Missing Screenshot & Screen Recording Prevention | CWE-200 / MASVS-STORAGE-9 | **LOW (INFO)** | `MainActivity.java` (Missing `FLAG_SECURE`) | **ACTIVE** |
| **AND-08** | Absence of Root Detection & Tamper Checks | CWE-919 / MASVS-RESILIENCE-1 | **LOW (INFO)** | Application Core | **ACTIVE** |

---

## 2. Detailed Technical Vulnerability Analysis

### AND-01: StrandHogg 2.0 Task Hijacking Vulnerability (Flagged by MobSFScan)
- **Severity:** **HIGH (ERROR)**
- **Rule ID:** `android_task_hijacking2`
- **File Reference:** `app/src/main/AndroidManifest.xml` (Line 23)
- **Technical Analysis:**
  MobSFScan identified that `MainActivity` is declared with:
  ```xml
  <activity
      android:name=".MainActivity"
      android:exported="true"
      android:launchMode="singleTop">
  ```
  Because `launchMode` is set to `singleTop` without an explicit empty `taskAffinity=""`, the activity is vulnerable to StrandHogg 2.0 task hijacking attacks. A co-located malicious application on the same Android device can inject a malicious spoofed activity onto the task stack of this application, presenting a seamless overlay phishing attack to steal user credentials.
- **Recommended Remediation:**
  Set `android:launchMode="singleInstance"` and add `android:taskAffinity=""` on `MainActivity` in `AndroidManifest.xml`.

---

### AND-02: Unauthenticated HTTP REST Push to Firebase RTDB
- **Severity:** **MEDIUM (CVSS 6.5)**
- **File Reference:** `app/src/main/java/com/notrack/stealth/sync/FirebaseHelper.java` (Lines 42–49)
- **Technical Analysis:**
  In `sendRealtimeRestPost()`:
  ```java
  String urlString = RTDB_URL + "notifications_log/" + item.deviceId + "/" + item.messageId + ".json";
  URL url = new URL(urlString);
  conn = (HttpURLConnection) url.openConnection();
  conn.setRequestMethod("PUT");
  ```
  The HTTP REST request sends raw JSON payloads to Firebase Realtime Database without appending `?auth=<token>` or passing an `Authorization: Bearer <token>` header.
  Once Firebase Security Rules enforce `auth != null`, all HTTP REST telemetry uploads will fail immediately with HTTP 401.
- **Recommended Remediation:**
  Retrieve the authenticated Firebase device custom token (minted via `/api/devices/auth-token`) and append `?auth=" + token` to the RTDB endpoint URL.

---

### AND-03: Release APK Signed with Public Debug Keystore
- **Severity:** **MEDIUM (CVSS 5.5)**
- **File Reference:** `app/build.gradle` (Lines 24–33, 52–58)
- **Technical Analysis:**
  The `release` build type uses `debug.keystore`:
  ```groovy
  signingConfigs {
      permanentSigner {
          storeFile file('debug.keystore')
          storePassword 'android'
          keyAlias 'androiddebugkey'
          keyPassword 'android'
      }
  }
  buildTypes {
      release {
          signingConfig signingConfigs.permanentSigner
      }
  }
  ```
  The debug keystore and its passwords (`android`/`androiddebugkey`) are public. Any attacker with repository access can sign modified binaries with the exact same signature.
- **Recommended Remediation:**
  Create a production release keystore protected by secret environment variables (e.g., GitHub Actions Secrets) rather than hardcoding debug keys in version control.

---

### AND-04: Code Obfuscation (R8/ProGuard) Disabled in Release Builds
- **Severity:** **MEDIUM (CVSS 4.8)**
- **File Reference:** `app/build.gradle` (Line 54)
- **Technical Analysis:**
  `minifyEnabled false` leaves the release APK completely un-obfuscated. Reverse-engineering the APK with `jadx` or `apktool` reveals all variable names, encryption algorithms, API paths, and internal logic without resistance.
- **Recommended Remediation:**
  Enable code shrinking and obfuscation:
  ```groovy
  release {
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
  }
  ```

---

### AND-05: CI/CD Pipeline Automation Failure on Hardened RTDB Rules
- **Severity:** **MEDIUM (CVSS 5.3)**
- **File Reference:** `.github/workflows/release_update.yml` (Lines 139–150)
- **Technical Analysis:**
  The automated release workflow executes:
  `curl -s -X PATCH "https://stealthapp-50da2-default-rtdb.firebaseio.com/app_update.json" ...`
  without authentication. When the hardened `database.rules.json` is deployed, this curl command will be rejected by Firebase with HTTP 401, breaking automated app updates. In addition, `sha256_hash` is not calculated or published during build, causing Android clients to skip SHA-256 integrity verification.
- **Recommended Remediation:**
  Supply `?auth=${{ secrets.FIREBASE_DB_SECRET }}` in the curl command and append the computed SHA-256 checksum to the update JSON payload.

---

### AND-06: Missing Public Key / TLS Certificate Pinning
- **Severity:** **LOW (INFO)**
- **File Reference:** `app/src/main/res/xml/network_security_config.xml`
- **Technical Analysis:**
  The network security configuration enforces `cleartextTrafficPermitted="false"`, which blocks unencrypted HTTP traffic. However, certificate pinning is not configured. An attacker who compromises a trusted root CA on a device could intercept HTTPS traffic.
- **Recommended Remediation:**
  Add `<pin-set>` for Firebase and GitHub domains in `network_security_config.xml`.

---

### AND-07: Missing Screenshot & Screen Recording Prevention (`FLAG_SECURE`)
- **Severity:** **LOW (INFO)**
- **File Reference:** `MainActivity.java`
- **Technical Analysis:**
  `MainActivity` does not declare `getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);`. Sensitive screens can be captured in task switchers or by spyware.
- **Recommended Remediation:**
  Add `FLAG_SECURE` in `onCreate()` for screens displaying sensitive telemetry.

---

### AND-08: Absence of Root Detection & Tamper Checks
- **Severity:** **LOW (INFO)**
- **Technical Analysis:**
  The application runs without checking if the device has been rooted or if a debugger is attached. On a rooted device, an attacker with root shell access can dump memory or inspect unencrypted app preferences.
- **Recommended Remediation:**
  Add root detection checks using RootBeer or Google Play Integrity API.

---

## 3. Android Security Action Checklist

- [ ] Add `android:launchMode="singleInstance"` and `android:taskAffinity=""` to `MainActivity`.
- [ ] Add `?auth=<token>` parameter to `FirebaseHelper.java` HTTP REST PUT requests.
- [ ] Replace `debug.keystore` with a private release keystore via GitHub Secrets.
- [ ] Set `minifyEnabled true` in `app/build.gradle` for release builds.
- [ ] Add Firebase DB Secret to `.github/workflows/release_update.yml` and compute `sha256_hash`.
- [ ] Add `FLAG_SECURE` to `MainActivity.java` window flags.
