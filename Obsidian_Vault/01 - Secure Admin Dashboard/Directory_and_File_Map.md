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

यह दस्तावेज वेब डैशबोर्ड की प्रत्येक मुख्य फ़ाइल और उसके उद्देश्य का पूरा विवरण प्रस्तुत करता है।

## 📁 `src/` (कोर एप्लिकेशन सोर्स)

### 1. `src/middleware.js`
- **उद्देश्य:** Next.js Edge Middleware।
- **सुरक्षा कार्य:** हर इनकमिंग HTTP रिक्वेस्ट के रूट को इंटरसेप्ट करता है। प्रोटेक्टेड रूट्स (`/dashboard/*`) पर सेशन टोकन का अस्तित्व और वैधता जांचता है। अमान्य होने पर तुरंत `/login` पर रीडायरेक्ट करता है।

---

## 📁 `src/app/` (Next.js 14 App Router पेजेस)

| फ़ाइल पाथ | उद्देश्य | एक्सेस स्तर |
| :--- | :--- | :--- |
| `src/app/layout.jsx` | रूट लेआउट, फॉन्ट लोडिंग, ग्लोबल प्रोवाइडर्स (`AuthContext`, `KeyVaultContext`) | पब्लिक |
| `src/app/page.jsx` | लैंडिंग / ऑटो-रीडायरेक्ट पेज (लॉगिन या ओवरव्यू पर भेजता है) | पब्लिक |
| `src/app/globals.css` | टेलविंड CSS और कस्टम डार्क थीम शैलियाँ | पब्लिक |
| `src/app/login/page.jsx` | एडमिन लॉगिन इंटरफ़ेस (ईमेल/पासवर्ड + MFA) | पब्लिक |
| `src/app/register/page.jsx` | नया एडमिन पंजीकरण फॉर्म | पब्लिक (एडमिन अप्रूवल आवश्यक) |
| `src/app/pending-approval/page.jsx` | गैर-मंजूर यूज़र्स के लिए होल्डिंग स्क्रीन | ऑथेंटिकेटेड |
| `src/app/verify-email/page.jsx` | ईमेल सत्यापन नोटिस और रीसेंड एक्शन | ऑथेंटिकेटेड |
| `src/app/portal-access/[token]/page.jsx` | वन-टाइम इमरजेंसी टोकन ऑथेंटिकेशन पोर्टल | टोकन-गार्डेड |

### 📁 `src/app/dashboard/` (प्रोटेक्टेड एडमिन कंसोल)

| फ़ाइल पाथ | डैशबोर्ड मॉड्यूल | संबंधित डेटाबेस नोड |
| :--- | :--- | :--- |
| `src/app/dashboard/overview/page.jsx` | मुख्य सारांश, लाइव डिवाइसेस, रीसेंट इवेंट्स | `/devices`, `/audit_logs` |
| `src/app/dashboard/devices/page.jsx` | इनरोल्ड Android डिवाइसेस की सूची, स्टेटस, टोकन जनरेशन | `/devices` |
| `src/app/dashboard/messages/page.jsx` | इन-मेमोरी डिक्रिप्टेड नोटिफिकेशन चैट स्ट्रीम | `/notifications_log` |
| `src/app/dashboard/conversations/page.jsx` | ऐप-वाइज और चैट-वाइज ग्रुपिंग व्यू | `/notifications_log` |
| `src/app/dashboard/sms/page.jsx` | SMS वॉल्ट व्यूअर (डिक्रिप्टेड इनबॉक्स/आउटबॉक्स) | `/sms_vault` |
| `src/app/dashboard/contacts/page.jsx` | कॉन्टैक्ट्स डायरेक्टरी व्यूअर (सर्च, फोन, ईमेल) | `/contacts_vault` |
| `src/app/dashboard/media/page.jsx` | अटैचमेंट्स और मीडिया फाइल्स एक्सप्लोरर | `/media_vault` |
| `src/app/dashboard/sync-logs/page.jsx` | डिवाइस सिंक स्थिति, बैटरी, नेटवर्क, लास्ट पिंग | `/sync_status` |
| `src/app/dashboard/security/page.jsx` | सुरक्षा ऑडिट लॉगर, सेशन टर्मिनेशन, रोल असाइनमेंट | Firestore `audit_logs` |
| `src/app/dashboard/users/page.jsx` | एडमिन यूज़र मैनेजमेंट, अप्रूवल, डिसेबलिंग | Firestore `users` |
| `src/app/dashboard/app-updates/page.jsx` | Android APK रिमोट अपडेट डिप्लॉयमेंट मैनेजर | `/app_updates` |
| `src/app/dashboard/analytics/page.jsx` | सिस्टम मेट्रिक्स, इवेंट फ्रीक्वेंसी चार्ट्स | एनालिटिक्स |

---

## 📁 `src/app/api/` (सुरक्षित सर्वर-साइड एंडपॉइंट्स)

- `src/app/api/admin/approvals/route.js` — नए एडमिन अप्रूवल (सुपर एडमिन ओनली)।
- `src/app/api/admin/users/route.js` — एडमिन यूज़र्स की लिस्टिंग और रोल मॉडिफिकेशन।
- `src/app/api/admin/vault-init/route.js` — मास्टर क्रिप्टोग्राफिक वॉल्ट का इनिशियलाइजेशन।
- `src/app/api/admin/vault-update/route.js` — वॉल्ट कीज़ का रोटेशन और री-रैपिंग।
- `src/app/api/auth/sync-login/route.js` — सिक्योर क्रेडेंशियल ऑथेंटिकेशन और सेशन टोकन इश्यू।
- `src/app/api/auth/progressive-lockout/route.js` — असफल लॉगिन अटैम्प्ट्स पर घातांकीय देरी (Exponential Delay)।
- `src/app/api/auth/verify-session/route.js` — HMAC-SHA256 सेशन टोकन क्रिप्टोग्राफिक वैलिडेशन।
- `src/app/api/devices/enroll/route.js` — नया Android डिवाइस इनरोलमेंट और पब्लिक-की बाइंडिंग।
- `src/app/api/devices/generate-token/route.js` — डिवाइस ऑथेंटिकेशन टोकन जनरेशन (एडमिन ओनली)।
- `src/app/api/app-update/route.js` — APK वर्जन, SHA-256 हैश, और डाउनलोड URL पब्लिशिंग।

---

## 📁 `src/lib/` (कोर लाइब्रेरीज़ & सुरक्षा इंजन)

### 🔐 `src/lib/encryption/`
- `webCrypto.js` — ब्राउज़र-नेटिव WebCrypto API (AES-256-GCM, ECDH P-256, PBKDF2)।
- `KeyVaultContext.jsx` — React Context जो केवल एक्टिव ब्राउज़र सेशन की मेमोरी में कीज को रखता है।
- `vaultDecryptor.js` — RTDB से आने वाले साइफरटेक्स्ट को डिक्रिप्ट करने वाला स्ट्रीम डिक्रिप्टर।
- `masterVaultService.js` — मास्टर की एनक्रिप्शन और BIP-39 रिकवरी पाथ।
- `signatureUtils.js` — क्रिप्टोग्राफिक सिग्नेचर जनरेशन और वेरिफिकेशन।

### 🛡️ `src/lib/auth/`
- `sessionCrypto.js` — HMAC-SHA256 साइनिंग, `crypto.timingSafeEqual` के साथ टाइमिंग-अटैक प्रूफ वेरिफिकेशन।
- `rbac.js` — रोल-बेस्ड एक्सेस कंट्रोल डेफिनिशन (`ROLE_SUPER_ADMIN`, `ROLE_ADMIN`, `ROLE_VIEWER`)।
- `rateLimiter.js` — इन-मेमोरी स्लाइडिंग विंडो IP और टोकन रेट लिमिटर।
- `AuthContext.jsx` — यूज़र ऑथेंटिकेशन स्टेट और ऑटो-रिफ्रेशिंग सेशन।

### ☁️ `src/lib/firebase/`
- `admin.js` — Firebase Admin SDK इनिशियलाइजेशन (सर्विस अकाउंट क्रेडेंशियल्स के साथ)।
- `client.js` — Firebase Client SDK इनिशियलाइजेशन (ब्राउज़र के लिए)।
- `firestoreService.js` — Firestore रीड/राइट हेल्पर्स।

---

🔗 आगे पढ़ें: [[Authentication_and_RBAC|ऑथेंटिकेशन और RBAC]] | [[Key_Vault_and_Crypto_Engine|की वॉल्ट और क्रिप्टो]]
