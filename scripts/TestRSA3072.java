import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.security.spec.*;

public class TestRSA3072 {
    public static void main(String[] args) throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(3072);
        KeyPair kp = kpg.generateKeyPair();
        System.out.println("Java generated RSA-3072 KeyPair");

        Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
        OAEPParameterSpec oaepSpec = new OAEPParameterSpec(
            "SHA-256", "MGF1", new MGF1ParameterSpec("SHA-256"), PSource.PSpecified.DEFAULT
        );
        cipher.init(Cipher.ENCRYPT_MODE, kp.getPublic(), oaepSpec);
        byte[] secret = new byte[32];
        new SecureRandom().nextBytes(secret);
        byte[] enc = cipher.doFinal(secret);
        System.out.println("Java encrypted 32-byte AES key: " + enc.length + " bytes");

        cipher.init(Cipher.DECRYPT_MODE, kp.getPrivate(), oaepSpec);
        byte[] dec = cipher.doFinal(enc);
        System.out.println("Decryption matches: " + java.util.Arrays.equals(secret, dec));
    }
}

