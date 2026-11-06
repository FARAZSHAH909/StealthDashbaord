import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.*;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import javax.crypto.spec.SecretKeySpec;

public class TestAndroidCryptoInterop {

    public static byte[] buildCanonicalBinaryAad(String deviceId, String messageId, long seqNum, int keyVersion, long timestamp, boolean isMigration) {
        byte[] devBytes = deviceId.getBytes(StandardCharsets.UTF_8);
        byte[] msgBytes = messageId.getBytes(StandardCharsets.UTF_8);
        int totalLen = 4 + 2 + 2 + 1 + 8 + 8 + 2 + devBytes.length + 2 + msgBytes.length;
        ByteBuffer bb = ByteBuffer.allocate(totalLen).order(ByteOrder.BIG_ENDIAN);
        bb.put(new byte[]{0x53, 0x4E, 0x41, 0x41}); // "SNAA"
        bb.putShort((short) 2);
        bb.putShort((short) keyVersion);
        bb.put((byte) (isMigration ? 1 : 0));
        bb.putLong(seqNum);
        bb.putLong(timestamp);
        bb.putShort((short) devBytes.length);
        bb.put(devBytes);
        bb.putShort((short) msgBytes.length);
        bb.put(msgBytes);
        return bb.array();
    }

    public static byte[] buildCanonicalSigningPayload(byte[] aad, byte[] iv, byte[] cipher, byte[] tag) {
        int totalLen = 4 + 2 + aad.length + 2 + iv.length + 4 + cipher.length + 2 + tag.length;
        ByteBuffer bb = ByteBuffer.allocate(totalLen).order(ByteOrder.BIG_ENDIAN);
        bb.put(new byte[]{0x53, 0x4E, 0x53, 0x47}); // "SNSG"
        bb.putShort((short) aad.length);
        bb.put(aad);
        bb.putShort((short) iv.length);
        bb.put(iv);
        bb.putInt(cipher.length);
        bb.put(cipher);
        bb.putShort((short) tag.length);
        bb.put(tag);
        return bb.array();
    }

    public static void main(String[] args) throws Exception {
        // Read Master RSA-3072 public key SPKI passed as argument 0
        String masterPubSpkiB64 = args[0];
        byte[] masterSpkiBytes = Base64.getDecoder().decode(masterPubSpkiB64);
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(masterSpkiBytes);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        PublicKey masterPublicKey = kf.generatePublic(keySpec);

        // 1. Android generates device AES-256 data key
        byte[] rawDeviceKey = new byte[32];
        new SecureRandom().nextBytes(rawDeviceKey);

        // 2. Android wraps device key with Master Public Key (RSA-3072 OAEP)
        Cipher rsaCipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
        OAEPParameterSpec oaepParams = new OAEPParameterSpec(
                "SHA-256", "MGF1", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT);
        rsaCipher.init(Cipher.ENCRYPT_MODE, masterPublicKey, oaepParams);
        byte[] wrappedKeyBytes = rsaCipher.doFinal(rawDeviceKey);
        String wrappedKeyB64 = Base64.getEncoder().encodeToString(wrappedKeyBytes);

        // 3. Android generates EC P-256 signing keypair
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair ecKp = kpg.generateKeyPair();
        String deviceSpkiB64 = Base64.getEncoder().encodeToString(ecKp.getPublic().getEncoded());

        // 4. Encrypt telemetry message with AES-256-GCM + Binary AAD
        String deviceId = "samsung_s24_prod_001";
        String messageId = "msg_live_77889900";
        long seqNum = 1001L;
        int keyVersion = 1;
        long timestamp = 1731000050000L;
        boolean isMigration = false;
        String plaintext = "CRITICAL_ALERT: Unauthorized login attempt detected from IP 198.51.100.42";

        byte[] aad = buildCanonicalBinaryAad(deviceId, messageId, seqNum, keyVersion, timestamp, isMigration);

        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);

        Cipher gcmCipher = Cipher.getInstance("AES/GCM/NoPadding");
        gcmCipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(rawDeviceKey, "AES"), new GCMParameterSpec(128, iv));
        gcmCipher.updateAAD(aad);
        byte[] fullCipher = gcmCipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

        byte[] cipherBody = Arrays.copyOfRange(fullCipher, 0, fullCipher.length - 16);
        byte[] authTag = Arrays.copyOfRange(fullCipher, fullCipher.length - 16, fullCipher.length);

        // 5. Sign canonical envelope with EC P-256
        byte[] signPayload = buildCanonicalSigningPayload(aad, iv, cipherBody, authTag);
        Signature sig = Signature.getInstance("SHA256withECDSA");
        sig.initSign(ecKp.getPrivate());
        sig.update(signPayload);
        byte[] derSignature = sig.sign();
        String derSigB64 = Base64.getEncoder().encodeToString(derSignature);

        // Output JSON for Web Crypto verification script
        System.out.printf("INTEROP_JSON_START{" +
                "\"wrapped_device_key\":\"%s\"," +
                "\"device_spki\":\"%s\"," +
                "\"device_id\":\"%s\"," +
                "\"message_id\":\"%s\"," +
                "\"seq_num\":%d," +
                "\"key_version\":%d," +
                "\"timestamp\":%d," +
                "\"iv\":\"%s\"," +
                "\"ciphertext\":\"%s\"," +
                "\"auth_tag\":\"%s\"," +
                "\"device_signature\":\"%s\"," +
                "\"expected_plaintext\":\"%s\"" +
                "}INTEROP_JSON_END\n",
                wrappedKeyB64,
                deviceSpkiB64,
                deviceId,
                messageId,
                seqNum,
                keyVersion,
                timestamp,
                Base64.getEncoder().encodeToString(iv),
                Base64.getEncoder().encodeToString(cipherBody),
                Base64.getEncoder().encodeToString(authTag),
                derSigB64,
                plaintext
        );
    }
}

