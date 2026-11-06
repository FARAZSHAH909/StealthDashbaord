# 🛡️ Stealth Dashboard - Production-Grade Secure Admin Dashboard

A high-performance, enterprise-grade Next.js web dashboard engineered to monitor, organize, decrypt, and analyze synchronized notification telemetry from the **Stealth Notification Monitor** Android application.

---

## 🌟 Key Architecture Highlights

- **Dynamic Single-Use Cloud Rolling Tokens (Zero-Trust Enrollment)**:
  - No static hardcoded secrets! Invitation keys are generated dynamically and stored directly in the Cloud (`admin_invite_tokens/active_token`).
  - **Atomic Burn & Destruction**: Once an invitation key is used to register an administrator, it is **immediately burned and deleted** from the cloud.
  - **Automatic Rotation**: The moment a key is consumed, the server automatically generates a brand-new random cryptographic key in the cloud.
  - Replay attacks are strictly blocked with HTTP 403.
  - Private & Hidden: No dashboard UI displays this key. You query your current active key securely via CLI.
- **Browser-Side AES-256-GCM Decryption (W3C Web Crypto API)**:
  - Payloads are decrypted inside the administrator's authorized browser runtime.
  - Zero-persistence guarantee: Plaintext and cryptographic keys exist solely in transient JavaScript memory and are never saved to disk, cookies, LocalStorage, or analytics caches.
  - Wiped automatically upon session termination, logout, or inactivity timeout.
- **WhatsApp-Style Modern Messaging Interface**:
  - Left panel: Searchable conversation list, contacts, app badges, timestamps, unread counts.
  - Right panel: Chat history with WhatsApp-styled chat bubbles, timestamp labels, date separators, and SHA-256 digital checksum verification badges.
  - Automatic grouping by sender identity, device ID, and application package context.
- **Strict Role-Based Access Control (RBAC)**:
  - `super_admin`, `admin`, and `read_only` roles enforced via custom claims and server-side route handlers.
  - In-memory progressive brute-force rate limiter (locks after 5 failed attempts).
- **Dedicated Dashboard Sections**:
  1. `Overview`: 10 real-time metric cards, hourly activity histogram, app distribution.
  2. `Messages`: Dedicated WhatsApp-style messaging interface with in-chat search.
  3. `Conversations`: High-level conversation thread directory with device filtering.
  4. `Devices`: Registered hardware clients, status, message counts, and access revocation.
  5. `Applications`: Monitored Android applications (`WhatsApp`, `Google Search`, `Indeed`, etc.).
  6. `Sync Logs`: Immutable telemetry log table with pagination and checksum verification.
  7. `Analytics`: Temporal distributions, 24-hour activity patterns, day-of-week histograms.
  8. `Security Activity`: Cryptographic baseline monitor, CSP status, progressive rate limiter metrics.
  9. `Admin Users`: Administrator management and role assignments.

---

## 🚀 Quick Start Guide

### 1. Check Your Current Active Cloud Invite Key
Whenever you want to register an admin account, get the current one-time key directly from the cloud:
```bash
npm run get-invite-token
```

### 2. Register an Admin Account
1. Open [http://localhost:3000/register](http://localhost:3000/register) in your browser.
2. Paste the active token from `npm run get-invite-token` into the **Invitation Secret Token** field.
3. Enter your email, password, and select your role (`Super Admin` or `Admin`).
4. Click **Create Authorized Admin**.
5. The key is instantly burned and rotated in the cloud!

### 3. Bootstrap Super Admin via CLI (Alternative)
You can also directly create a Super Admin account via CLI without needing the web form:
```bash
node scripts/bootstrap-admin.js admin@yourdomain.com "YourStrongPassword123!"
```

### 4. Run Development / Production Server
```bash
# Production Start (Currently active on port 3000)
npm run start -p 3000

# Or Development Mode
npm run dev
```

---

## 🔐 Browser-Side Decryption Vault

1. Log into the dashboard at [http://localhost:3000/login](http://localhost:3000/login).
2. The dashboard automatically syncs and decrypts AES-256-GCM messages in-memory for authorized administrators.
3. Lock/Unlock status is cryptographically protected with Hex identity assurance badges.
