import java.security.*;
import java.util.Base64;

public class TestECDSAJava {
    public static void main(String[] args) throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new java.security.spec.ECGenParameterSpec("secp256r1"));
        KeyPair kp = kpg.generateKeyPair();
        System.out.println("Java generated EC P-256 keypair");

        byte[] spkiBytes = kp.getPublic().getEncoded();
        System.out.println("Java Public Key SPKI length: " + spkiBytes.length + " bytes");

        byte[] data = "TestCanonicalTelemetryPayload".getBytes(java.nio.charset.StandardCharsets.UTF_8);

        // Java 9+ provides SHA256withECDSAinP1363Format which outputs exact 64-byte r||s matching Web Crypto API!
        Signature sig = Signature.getInstance("SHA256withECDSAinP1363Format");
        sig.initSign(kp.getPrivate());
        sig.update(data);
        byte[] p1363Sig = sig.sign();
        System.out.println("Java P1363 Signature length: " + p1363Sig.length + " bytes (expected 64)");

        // Verify locally
        Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
        verifier.initVerify(kp.getPublic());
        verifier.update(data);
        boolean ok = verifier.verify(p1363Sig);
        System.out.println("Java local verification: " + ok);

        // Output JSON for WebCrypto cross-verification
        System.out.printf("JSON_START{\"spki\":\"%s\",\"sig\":\"%s\"}JSON_END\n",
            Base64.getEncoder().encodeToString(spkiBytes),
            Base64.getEncoder().encodeToString(p1363Sig));
    }
}

