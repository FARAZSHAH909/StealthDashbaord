---
title: Firebase App - Hardware KeyStore and Cryptography
tags:
  - firebase-app
  - android
  - keystore
  - cryptography
  - strongbox
project: Firebase App
aliases:
  - Android Keystore & Crypto
date_created: 2026-11-21
status: complete
---

# 🔐 Hardware-Backed Android KeyStore & Cryptography

The Firebase App secures all encryption keys inside the Android hardware-backed KeyStore system (Trusted Execution Environment / StrongBox).

```mermaid
flowchart TD
    subgraph HardwareBoundary ["Hardware Security Module (HSM / StrongBox / TEE)"]
        KeystoreAlias["KeyStore Alias: 'stealth_master_key'"]
        ECKey["EC P-256 Private Key (Non-Exportable)"]
        AESKey["AES-256 SecretKey"]
    end

    subgraph AppProcess ["App Sandbox (Java Runtime)"]
        RawData["Cleartext Notification / SMS / Contact"]
        CipherEngine["EncryptionUtils.java (Cipher.getInstance('AES/GCM/NoPadding'))"]
        IVGen["SecureRandom (12-byte IV)"]
        PackedPayload["Packaged Payload: Base64(IV + Ciphertext + Tag)"]
    end

    RawData --> CipherEngine
    IVGen --> CipherEngine
    AESKey -->|Hardware Encryption Operation| CipherEngine
    CipherEngine --> PackedPayload
```

---

## 1. Hardware Isolation (`KeyEnrollmentHelper.java`)
- **NIST P-256 Curve (secp256r1):** The app generates an elliptic curve key pair on first launch inside the KeyStore.
- **Non-Exportable Keys:** Private keys can never be extracted from the secure hardware chip. Cryptographic signing and decryption happen inside the chip itself.
- **StrongBox Support:** Devices with dedicated hardware security chips store keys in StrongBox for maximum tamper resistance.

---

## 2. AES-256-GCM Symmetric Encryption (`EncryptionUtils.java`)
- **Algorithm:** `AES/GCM/NoPadding`.
- **Key Length:** 256 bits.
- **Initialization Vector (IV):** A unique, cryptographically random 12-byte IV is generated for every single record via `SecureRandom`.
- **Authentication Tag:** A 128-bit authentication tag guarantees message integrity and prevents tampering.

---

🔗 Next: [[Sync_Engines_and_Firebase_REST|Sync Engines and Firebase REST]] | [[03 - Shared Protocols & RTDB/End_to_End_Encryption_Handshake|E2EE Handshake]]
