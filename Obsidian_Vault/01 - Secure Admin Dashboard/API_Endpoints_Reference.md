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

सभी बैकएंड API एंडपॉइंट्स Next.js 14 App Router (`src/app/api/...`) में कार्यान्वित हैं और `src/lib/api/secureApiHandler.js` द्वारा सुरक्षित हैं।

## 1. प्रमाणीकरण और सत्र एंडपॉइंट्स (Auth & Session APIs)

### `POST /api/auth/sync-login`
- **विवरण:** एडमिन लॉगिन क्रेडेंशियल्स को सत्यापित करता है और क्रिप्टोग्राफ़िक रूप से हस्ताक्षरित सत्र कुकी सेट करता है।
- **सुरक्षा:** IP-आधारित और क्रेडेंशियल-आधारित स्लाइडिंग विंडो रेट लिमिट।
- **अनुरोध:**
  ```json
  {
    "email": "admin@domain.com",
    "password": "SecurePassword123!"
  }
  ```
- **प्रतिक्रिया (200 OK):**
  ```json
  {
    "success": true,
    "user": { "uid": "...", "email": "...", "role": "admin" }
  }
  ```

### `POST /api/auth/verify-session`
- **विवरण:** वर्तमान कुकी से प्राप्त सत्र टोकन के HMAC-SHA256 हस्ताक्षर की पुष्टि करता है।
- **सुरक्षा:** `crypto.timingSafeEqual` द्वारा संरक्षित।

### `POST /api/auth/progressive-lockout`
- **विवरण:** असफल लॉगिन प्रयासों को रिकॉर्ड करता है और घातांकीय लॉकआउट समय लौटाता है।

---

## 2. डिवाइस प्रबंधन एंडपॉइंट्स (Device Management APIs)

### `POST /api/devices/enroll`
- **विवरण:** नए Android डिवाइस को सिस्टम में रजिस्टर करता है।
- **सुरक्षा:** दर सीमा (`globalRateLimiter`), डिवाइस फिंगरप्रिंट वैलिडेशन।
- **अनुरोध:**
  ```json
  {
    "deviceId": "dev_abc123",
    "model": "Samsung S24",
    "osVersion": "Android 14",
    "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE..."
  }
  ```

### `POST /api/devices/generate-token`
- **विवरण:** इनरोल्ड डिवाइस के लिए Firebase RTDB REST एक्सेस टोकन जनरेट करता है।
- **सुरक्षा:** **केवल सुपर-एडमिन या एडमिन** (`requiredRole: 'admin'`)।

---

## 3. क्रिप्टोग्राफिक वॉल्ट एंडपॉइंट्स (Vault APIs)

### `POST /api/admin/vault-init`
- **विवरण:** पहली बार सिस्टम सेटअप के दौरान मास्टर की वॉल्ट बनाता है।
- **सुरक्षा:** केवल `super_admin`।

### `POST /api/admin/vault-update`
- **विवरण:** वॉल्ट पासफ़्रेज़ बदलने या कीज़ को री-रैप करने के लिए।
- **सुरक्षा:** केवल `super_admin`।

### `GET /api/v1/admin/audit-logs`
- **विवरण:** सभी संवेदनशील प्रशासनिक क्रियाओं का संपूर्ण ऑडिट लॉग पुनर्प्राप्त करता है।
- **सुरक्षा:** केवल `super_admin`।

---

🔗 आगे पढ़ें: [[Realtime_Sync_and_Firebase|रियल-टाइम सिंक]] | [[Security_and_DevSecOps|सिक्योरिटी और DevSecOps]]
