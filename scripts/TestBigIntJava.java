import java.nio.ByteBuffer;

public class TestBigIntJava {
    public static void main(String[] args) {
        long bigSeq = (1L << 55) + 12345L; // 36028797018976313
        ByteBuffer buf = ByteBuffer.allocate(8);
        buf.putLong(bigSeq); // Default is Big-Endian
        byte[] bytes = buf.array();

        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        System.out.println("Java BigSeq string: " + bigSeq);
        System.out.println("Java Bytes (hex): " + sb.toString());
        if (sb.toString().equals("0080000000003039")) {
            System.out.println("✓ 64-bit BigInt / Java Long Binary Match PASSED!");
        }
    }
}

