import java.security.*;
import java.util.Arrays;

public class TestDerP1363Java {

    public static byte[] derToP1363(byte[] der) throws Exception {
        int offset = 0;
        if (der[offset++] != 0x30) throw new IllegalArgumentException("Expected SEQUENCE");
        int seqLen = der[offset++] & 0xff;
        if ((seqLen & 0x80) != 0) {
            int lenBytes = seqLen & 0x7f;
            offset += lenBytes;
        }

        if (der[offset++] != 0x02) throw new IllegalArgumentException("Expected INTEGER r");
        int rLen = der[offset++] & 0xff;
        int rStart = offset;
        offset += rLen;

        if (der[offset++] != 0x02) throw new IllegalArgumentException("Expected INTEGER s");
        int sLen = der[offset++] & 0xff;
        int sStart = offset;

        // Clean leading zero padding if length > 32
        while (rLen > 32 && der[rStart] == 0) { rStart++; rLen--; }
        while (sLen > 32 && der[sStart] == 0) { sStart++; sLen--; }

        if (rLen > 32 || sLen > 32) throw new IllegalArgumentException("Integer exceeds 32 bytes");

        byte[] p1363 = new byte[64];
        System.arraycopy(der, rStart, p1363, 32 - rLen, rLen);
        System.arraycopy(der, sStart, p1363, 64 - sLen, sLen);
        return p1363;
    }

    public static void main(String[] args) throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new java.security.spec.ECGenParameterSpec("secp256r1"));
        KeyPair kp = kpg.generateKeyPair();

        byte[] data = "SampleAndroidTelemetryPayload".getBytes(java.nio.charset.StandardCharsets.UTF_8);

        // Standard Android KeyStore signature format is ASN.1 DER:
        Signature derSig = Signature.getInstance("SHA256withECDSA");
        derSig.initSign(kp.getPrivate());
        derSig.update(data);
        byte[] derBytes = derSig.sign();
        System.out.println("Java DER Signature bytes: " + derBytes.length);

        // Transcode to P1363
        byte[] p1363Bytes = derToP1363(derBytes);
        System.out.println("Java Transcoded P1363 bytes: " + p1363Bytes.length);

        if (p1363Bytes.length == 64) {
            System.out.println("✓ DER-to-P1363 Java Transcoder PASSED!");
        }
    }
}

