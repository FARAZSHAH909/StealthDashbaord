const { getActiveCloudToken, validateAndConsumeCloudToken } = require("../src/lib/auth/cloudTokenManager");

async function testTokenCycle() {
  console.log("🧪 Testing Complete Dynamic Single-Use Cloud Token Lifecycle...\n");

  // 1. Get current active token
  const initial = await getActiveCloudToken();
  const currentToken = initial.token;
  console.log(`1. Current Cloud Token: ${currentToken}`);

  // 2. Consume it with a valid submission
  console.log("\n2. Submitting valid token for registration...");
  const result = await validateAndConsumeCloudToken(currentToken);
  console.log("   Result:", result);

  if (!result.valid) {
    throw new Error("Failed to validate active token!");
  }

  // 3. Verify that a NEW rolling token was created in the cloud
  const updated = await getActiveCloudToken();
  console.log(`\n3. New Cloud Rolling Token: ${updated.token}`);

  if (updated.token === currentToken) {
    throw new Error("Security Alert: Old token was not replaced in cloud!");
  }
  console.log("   ✓ Success: Token was immediately rotated in cloud storage!");

  // 4. Try to re-use the old burned token (Replay attack simulation)
  console.log(`\n4. Simulating replay attack: Trying to reuse old token "${currentToken}"...`);
  const replayResult = await validateAndConsumeCloudToken(currentToken);
  console.log("   Replay Result:", replayResult);

  if (replayResult.valid) {
    throw new Error("CRITICAL SECURITY VULNERABILITY: Burned token was accepted again!");
  }
  console.log("   ✓ Success: Replay attack strictly BLOCKED!");

  console.log("\n🎉 ALL SINGLE-USE CLOUD TOKEN INTEGRITY TESTS PASSED!");
}

testTokenCycle().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});

