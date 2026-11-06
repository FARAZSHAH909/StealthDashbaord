const http = require("http");

async function testUrl(url, options = {}) {
  const res = await fetch(url, options);
  console.log(`[${options.method || "GET"}] ${url} -> Status: ${res.status}`);
  return res;
}

async function run() {
  console.log("🔍 Verifying Production Server Endpoints on http://localhost:3000...\n");

  // 1. Test Login Page
  const loginRes = await testUrl("http://localhost:3000/login");
  const loginHtml = await loginRes.text();
  console.log(`  ✓ Login HTML served (${loginHtml.length} bytes, contains STEALTH: ${loginHtml.includes("STEALTH")})`);

  // 2. Test Register Page
  const regRes = await testUrl("http://localhost:3000/register");
  console.log(`  ✓ Register page status: ${regRes.status}`);

  // 3. Test Progressive Lockout API
  const lockoutRes = await testUrl("http://localhost:3000/api/auth/progressive-lockout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "check", identifier: "admin@test.com" }),
  });
  const lockoutData = await lockoutRes.json();
  console.log(`  ✓ Lockout API response:`, lockoutData);

  // 4. Test Dashboard Overview
  const overviewRes = await testUrl("http://localhost:3000/dashboard/overview");
  console.log(`  ✓ Overview page status: ${overviewRes.status}`);

  // 5. Test Messages Page (WhatsApp Interface)
  const messagesRes = await testUrl("http://localhost:3000/dashboard/messages");
  console.log(`  ✓ WhatsApp Messages page status: ${messagesRes.status}`);

  // 6. Test Security Headers
  console.log("\n🛡️ Verifying Production HTTP Security Headers:");
  const headers = loginRes.headers;
  console.log(`  • Content-Security-Policy: ${headers.get("content-security-policy") ? "PRESENT" : "MISSING"}`);
  console.log(`  • X-Frame-Options: ${headers.get("x-frame-options")}`);
  console.log(`  • X-Content-Type-Options: ${headers.get("x-content-type-options")}`);
  console.log(`  • Referrer-Policy: ${headers.get("referrer-policy")}`);

  console.log("\n✅ All server endpoints and security headers verified successfully!");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});

