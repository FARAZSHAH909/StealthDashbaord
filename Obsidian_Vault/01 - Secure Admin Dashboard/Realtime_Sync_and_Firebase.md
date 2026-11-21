---
title: Secure Admin Dashboard - Realtime Sync & Firebase Hooks
tags:
  - secure-admin-dashboard
  - realtime-sync
  - react-hooks
  - firebase
project: Secure Admin Dashboard
aliases:
  - Web Realtime Sync
date_created: 2026-11-21
status: complete
---

# 🔄 Realtime Sync & Custom React Hooks

वेब डैशबोर्ड Firebase Realtime Database (RTDB) के साथ लाइव दो-तरफ़ा सिंक बनाए रखने के लिए कस्टम रिएक्ट हुक्स का उपयोग करता है।

## 1. कोर डेटा हुक: `useFirebaseData.js`
- **उद्देश्य:** किसी भी RTDB पाथ पर लाइव WebSocket लिस्नर (`onValue`) सेट करता है।
- **सुरक्षा और मेमोरी प्रबंधन:** जब यूज़र पेज बदलता है, तो यह हुक अपने आप अनसब्सक्राइब (`off`) कर देता है ताकि मेमोरी लीक न हो।

```javascript
// Example Usage
const { data, loading, error } = useFirebaseData(`notifications_log/${deviceId}`);
```

---

## 2. SMS वॉल्ट हुक: `useSmsVault.js`
- **उद्देश्य:** `/sms_vault/${deviceId}` नोड को लाइव सुनता है।
- **स्वचालित बैच डिक्रिप्शन:** जैसे ही नया एनक्रिप्टेड SMS आता है, यह `KeyVaultContext` के साथ मिलकर बैकग्राउंड में उसे तुरंत डिक्रिप्ट करके UI स्टेट में डाल देता है।

---

## 3. कॉन्टैक्ट्स वॉल्ट हुक: `useContactsVault.js`
- **उद्देश्य:** `/contacts_vault/${deviceId}` नोड से सिंक किए गए सभी कॉन्टैक्ट्स लोड करता है।
- **क्लाइंट-साइड इंडेक्सिंग:** फोन नंबर, नाम और ईमेल के आधार पर इन-मेमोरी त्वरित सर्च (Search & Filter) प्रदान करता है।

---

## 4. रिमोट ऐप अपडेट हुक: `useAppUpdate.js`
- **उद्देश्य:** `/app_updates` नोड पर नया APK रिलीज़ पब्लिश करने, वर्जन ट्रैक करने और SHA-256 हैश वैरिफाई करने में मदद करता है।

---

🔗 आगे पढ़ें: [[Security_and_DevSecOps|सिक्योरिटी और DevSecOps]] | [[03 - Shared Protocols & RTDB/Realtime_Database_Schema|RTDB स्कीमा]]
