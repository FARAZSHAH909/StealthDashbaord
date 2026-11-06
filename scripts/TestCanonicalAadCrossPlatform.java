import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

public class TestCanonicalAadCrossPlatform {
    public static byte[] buildCanonicalBinaryAad(String deviceId, String messageId, long seqNum, int keyVersion, long timestamp, boolean isMigration) {
        byte[] devBytes = deviceId.getBytes(StandardCharsets.UTF_8);
        byte[] msgBytes = messageId.getBytes(StandardCharsets.UTF_8);
        int totalLen = 4 + 2 + 2 + 1 + 8 + 8 + 2 + devBytes.length + 2 + msgBytes.length;
        ByteBuffer bb = ByteBuffer.allocate(totalLen).order(ByteOrder.BIG_ENDIAN);
        bb.put(new byte[]{0x53, 0x4E, 0x41, 0x41}); // "SNAA"
        bb.putShort((short) 2); // proto v2
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

    public static void main(String[] args) {
        String devId = "dev_samsung_galaxy_s24";
        String msgId = "msg_notif_9876543210";
        long seq = 36028797018976313L; // 2^55 + 12345
        int keyVer = 1;
        long time = 1731000000000L;
        boolean mig = false;

        byte[] javaAad = buildCanonicalBinaryAad(devId, msgId, seq, keyVer, time, mig);
        String b64 = Base64.getEncoder().encodeToString(javaAad);
        System.out.println("Java Canonical AAD length: " + javaAad.length);
        System.out.println("Java Canonical AAD Base64: " + b64);
    }
}

