import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

public class AndroidCryptoProof {

    private static final String MASTER_PASSPHRASE = "StealthAdminSuperMasterPassphrase2026!";
    private static final String MASTER_SALT = "StealthAppMasterSalt2026";
    private static final int PBKDF2_ITERATIONS = 100000;
    private static final int KEY_LENGTH_BITS = 256;
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH_BYTES = 12;

    // 1. Derive Master Key Encryption Key (K_master) via PBKDF2
    public static SecretKey deriveMasterKey(String passphrase, String salt) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(passphrase.toCharArray(), salt.getBytes(StandardCharsets.UTF_8), PBKDF2_ITERATIONS, KEY_LENGTH_BITS);
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        byte[] keyBytes = factory.generateSecret(spec).getEncoded();
        return new SecretKeySpec(keyBytes, "AES");
    }

    // 2. Generate Device-Specific 256-bit Key (K_dev)
    public static SecretKey generateDeviceKey() throws Exception {
        KeyGenerator keyGen = KeyGenerator.getInstance("AES");
        keyGen.init(256, new SecureRandom());
        return keyGen.generateKey();
    }

    // 3. Wrap (Encrypt) K_dev using K_master with AES-GCM
    public static String[] wrapDeviceKey(SecretKey kMaster, SecretKey kDev) throws Exception {
        SecureRandom random = new SecureRandom();
        byte[] iv = new byte[IV_LENGTH_BYTES];
        random.nextBytes(iv);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, kMaster, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
        byte[] wrapped = cipher.doFinal(kDev.getEncoded());

        String ivBase64 = Base64.getEncoder().encodeToString(iv);
        String wrappedBase64 = Base64.getEncoder().encodeToString(wrapped);
        return new String[] { ivBase64, wrappedBase64 };
    }

    // 4. Encrypt Payload with K_dev using AES-GCM
    public static String[] encryptPayload(SecretKey kDev, String plainText) throws Exception {
        SecureRandom random = new SecureRandom();
        byte[] iv = new byte[IV_LENGTH_BYTES];
        random.nextBytes(iv);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, kDev, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
        byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

        String ivBase64 = Base64.getEncoder().encodeToString(iv);
        String cipherBase64 = Base64.getEncoder().encodeToString(cipherText);
        return new String[] { ivBase64, cipherBase64 };
    }

    public static void main(String[] args) throws Exception {
        System.out.println("--- Starting Android Java Cryptographic Engine Proof ---");

        // Step 1: Derive Master Key
        SecretKey kMaster = deriveMasterKey(MASTER_PASSPHRASE, MASTER_SALT);
        System.out.println("✓ Master Key derived via PBKDF2WithHmacSHA256 (100k iterations)");

        // Step 2: Generate Device-Specific Key
        SecretKey kDev = generateDeviceKey();
        System.out.println("✓ Generated unique device-specific 256-bit AES key (K_dev)");

        // Step 3: Wrap K_dev using K_master
        String[] wrappedKeyInfo = wrapDeviceKey(kMaster, kDev);
        String wrapIv = wrappedKeyInfo[0];
        String wrappedKey = wrappedKeyInfo[1];
        System.out.println("✓ K_dev securely wrapped with K_master via AES-GCM (12-byte IV, 128-bit tag)");

        // Step 4: Encrypt sample notification payload
        String originalMessage = "CONFIDENTIAL: Test notification encrypted by Android Java engine for device 863f2e7f930c6d8a!";
        String originalTitle = "WhatsApp: Secure Contact";

        String[] msgEnc = encryptPayload(kDev, originalMessage);
        String[] titleEnc = encryptPayload(kDev, originalTitle);

        System.out.println("\nJSON_OUTPUT_START");
        System.out.printf("{\"wrapIv\":\"%s\",\"wrappedKey\":\"%s\",\"msgIv\":\"%s\",\"msgCipher\":\"%s\",\"titleIv\":\"%s\",\"titleCipher\":\"%s\"}\n",
                wrapIv, wrappedKey, msgEnc[0], msgEnc[1], titleEnc[0], titleEnc[1]);
        System.out.println("JSON_OUTPUT_END");
    }
}

