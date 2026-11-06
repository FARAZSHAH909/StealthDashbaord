/**
 * SUPER ADMIN BOOTSTRAP SCRIPT
 *
 * Usage:
 *   node scripts/bootstrap-admin.js [email] [password]
 */

const admin = require("firebase-admin");

const projectId = process.env.FIREBASE_PROJECT_ID || "stealthapp-50da2";
const databaseURL = process.env.FIREBASE_DATABASE_URL || "https://stealthapp-50da2-default-rtdb.firebaseio.com";

const email = process.argv[2] || process.env.BOOTSTRAP_ADMIN_EMAIL || "superadmin@stealthapp.internal";
const password = process.argv[3] || process.env.BOOTSTRAP_ADMIN_PASSWORD || "SuperAdminSecure2026!";

async function main() {
  console.log(`🔐 Bootstrapping Initial Super Admin Account for [${projectId}]...`);
  console.log(`Email: ${email}`);

  if (!admin.apps.length) {
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        databaseURL,
      });
    } else {
      admin.initializeApp({ projectId, databaseURL });
    }
  }

  const auth = admin.auth();

  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`ℹ️ Existing user found (UID: ${user.uid}). Updating credentials & claims...`);
    await auth.updateUser(user.uid, { password });
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      user = await auth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: "Super Administrator",
      });
      console.log(`✅ New user created successfully (UID: ${user.uid})!`);
    } else {
      console.error("❌ Failed to query/create user:", err.message);
      process.exit(1);
    }
  }

  // Assign Super Admin custom claims
  await auth.setCustomUserClaims(user.uid, { role: "super_admin" });
  console.log(`🛡️ Role 'super_admin' custom claim successfully granted to ${email}!`);
  console.log("\n🎉 Admin bootstrap complete! You can now log into the web dashboard.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

