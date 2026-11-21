---
title: Secure Admin Dashboard - Architecture Overview
tags:
  - secure-admin-dashboard
  - web
  - architecture
  - nextjs
project: Secure Admin Dashboard
aliases:
  - Web Dashboard Overview
date_created: 2026-11-21
status: active
---

# 🌐 Secure Admin Dashboard — Architecture Overview

> [!NOTE] Project Identification
> - **Project Name:** Secure Admin Dashboard
> - **Platform:** Modern Web Browser (Chrome, Firefox, Safari, Edge)
> - **Codebase Path:** `c:\Users\mj\OneDrive\Desktop\SEALTHAPPDASHBOARD`
> - **Remote Git Repo:** `https://github.com/FARAZSHAH909/StealthDashbaord.git` (Branch: `staging`)
> - **Primary Tech Stack:** Next.js 14 (App Router), React 18, Tailwind CSS, Firebase Admin/Client SDK, WebCrypto API

```mermaid
flowchart TD
    subgraph Client ["Client-Side (Admin Browser)"]
        BrowserSession["Admin Browser Session"]
        KeyVault["KeyVaultContext (In-Memory Key State)"]
        WebCrypto["WebCrypto Engine (In-Browser Decryption)"]
        Feeds["Virtual Message Feed / SMS / Contacts Vault"]
    end

    subgraph Edge ["Next.js Edge / Node.js Runtime"]
        Middleware["src/middleware.js (Route Guard)"]
        SecureAPI["secureApiHandler.js (HMAC Signature Verification)"]
        RateLimiter["rateLimiter.js (Sliding Window Limit)"]
        RBAC["rbac.js (SuperAdmin / Admin / Viewer Roles)"]
    end

    subgraph FirebaseServices ["Firebase Cloud Layer"]
        FirebaseAuth["Firebase Auth (Identity)"]
        RTDB[("Firebase RTDB (notifications_log, sms_vault, contacts_vault)")]
        Firestore[("Cloud Firestore (audit_logs, system_events)")]
    end

    BrowserSession -->|Navigation| Middleware
    BrowserSession -->|API Requests with HMAC Session| SecureAPI
    SecureAPI --> RateLimiter --> RBAC
    BrowserSession -->|Direct Realtime Snapshot Listeners| RTDB
    RTDB -->|Encrypted Ciphertext| WebCrypto
    KeyVault -->|AES-256-GCM Master Key| WebCrypto
    WebCrypto -->|Decrypted Cleartext in Memory Only| Feeds
```

---

## 🏗️ Core Architectural Principles

### 1. Zero-Knowledge Client-Side Decryption
- The server never sees user data (calls, SMS, contacts, or notifications) in plain text.
- All decryption happens exclusively inside the browser's volatile memory via the native **W3C WebCrypto API**.
- Even if the cloud database is compromised, an attacker only gets AES-256-GCM encrypted ciphertext without keys.

### 2. Multi-Tier Defense-in-Depth
- **Layer 1 (Edge Middleware):** `src/middleware.js` intercepts every incoming HTTP request and redirects unauthenticated users to `/login` before rendering pages.
- **Layer 2 (HMAC Session Tokens):** Authentication relies on server-verified HMAC-SHA256 signatures (`src/lib/auth/sessionCrypto.js`) rather than insecure client cookies.
- **Layer 3 (Role-Based Access Control):** Permissions are strictly enforced across `super_admin`, `admin`, and `viewer`.
- **Layer 4 (Global Rate Limiting):** Progressive lockout and sliding-window IP limits protect endpoints against brute-force and DoS attacks.

---

## 🔗 Related Notes:
- Full File Map: [[Directory_and_File_Map|Directory and File Map]]
- Authentication & Roles: [[Authentication_and_RBAC|Authentication and RBAC]]
- Browser Crypto: [[Key_Vault_and_Crypto_Engine|Key Vault and Crypto Engine]]
- API Endpoints: [[API_Endpoints_Reference|API Endpoints Reference]]
- Master Index: [[00 - Start Here/00_Vault_Index|Master Index]]
