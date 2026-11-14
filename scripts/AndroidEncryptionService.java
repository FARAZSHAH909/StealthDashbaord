package com.stealthapp.security;

import android.util.Base64;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * PRODUCTION-GRADE UNIFIED AES-256-GCM ANDROID ENCRYPTION SERVICE
 *
 * Encrypts both sender_info and message_content using the Master AES Key.
 * Output Format: Base64([12-byte IV] + [AES-256-GCM Ciphertext + 16-byte Auth Tag])
 *
 * This format is 100% interoperable with the Web Crypto API on the Admin Dashboard.
 */
public class AndroidEncryptionService {

    // Removed hardcoded symmetric master key (Resolves VULN-01 / CWE-798 / CWE-321)
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;

    private static SecretKey masterSecretKey = null;

    /**
     * Initializes the service with a dynamic SecretKey (e.g. provisioned via Android Keystore,
     * authenticated handshake, or dynamic configuration). Hardcoded keys are prohibited (CWE-798).
     */
    public static synchronized void initialize(SecretKey secretKey) {
        if (secretKey == null) {
            throw new IllegalArgumentException("SecretKey cannot be null");
        }
        masterSecretKey = secretKey;
    }

    public static synchronized void initializeFromBase64(String base64Key) {
        if (base64Key == null || base64Key.trim().isEmpty()) {
            throw new IllegalArgumentException("Base64 encryption key cannot be null or empty");
        }
        byte[] keyBytes = Base64.decode(base64Key, Base64.DEFAULT);
        masterSecretKey = new SecretKeySpec(keyBytes, "AES");
    }

    /**
     * Initializes or returns the cached AES-256 SecretKey.
     * Throws IllegalStateException if not dynamically provisioned.
     */
    private static synchronized SecretKey getMasterSecretKey() {
        if (masterSecretKey == null) {
            String envKey = System.getenv("STEALTH_AES_KEY");
            if (envKey != null && !envKey.trim().isEmpty()) {
                initializeFromBase64(envKey.trim());
                return masterSecretKey;
            }
            throw new IllegalStateException("AndroidEncryptionService is uninitialized. Key must be provisioned dynamically (e.g. via Android Keystore or authenticated cloud handshake). Hardcoded keys are prohibited (CWE-798).");
        }
        return masterSecretKey;
    }

    /**
     * Encrypts plaintext string using AES-256-GCM with a fresh random 12-byte IV.
     * Prepends the IV to the ciphertext so the payload is self-contained and universally decryptable.
     *
     * @param plainText The message body or sender name to encrypt
     * @return Base64 encoded string containing [12-byte IV] + [Ciphertext + 16-byte Tag]
     */
    public static String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) {
            return "";
        }

        try {
            // 1. Generate cryptographically secure random 12-byte IV
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            new SecureRandom().nextBytes(iv);

            // 2. Initialize AES-GCM Cipher
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, getMasterSecretKey(), gcmSpec);

            // 3. Encrypt plaintext (Java GCM automatically appends 16-byte auth tag)
            byte[] cipherTextWithTag = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // 4. Pack into self-contained buffer: [12-byte IV] + [CiphertextWithTag]
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + cipherTextWithTag.length);
            buffer.put(iv);
            buffer.put(cipherTextWithTag);

            return Base64.encodeToString(buffer.array(), Base64.NO_WRAP);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Decrypts a self-contained payload: Base64([12-byte IV] + [Ciphertext + 16-byte Tag])
     */
    public static String decrypt(String base64Payload) {
        if (base64Payload == null || base64Payload.isEmpty()) {
            return "";
        }

        try {
            byte[] combined = Base64.decode(base64Payload, Base64.DEFAULT);
            if (combined.length < 28) { // 12 IV + 16 Tag = minimum 28 bytes
                return "";
            }

            // Extract 12-byte IV
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH_BYTES);

            // Extract Ciphertext + Tag
            int cipherTextLength = combined.length - GCM_IV_LENGTH_BYTES;
            byte[] cipherTextWithTag = new byte[cipherTextLength];
            System.arraycopy(combined, GCM_IV_LENGTH_BYTES, cipherTextWithTag, 0, cipherTextLength);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.DECRYPT_MODE, getMasterSecretKey(), gcmSpec);

            byte[] decrypted = cipher.doFinal(cipherTextWithTag);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            e.printStackTrace();
            return "";
        }
    }
}
