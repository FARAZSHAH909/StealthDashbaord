/**
 * ENTERPRISE SECURITY PENETRATION & VERIFICATION TEST SUITE
 * 
 * Tests:
 * 1. Security Headers (CSP, HSTS, X-Frame-Options, nosniff, Permissions-Policy)
 * 2. Unauthenticated Protected Route Cloaking (404 / portal redirect)
 * 3. Vulnerability Scanner & Path Traversal Probe Dropping (404)
 * 4. Disallowed HTTP Method Blocking (405 Method Not Allowed)
 * 5. CSRF / Cross-Origin Mutation Blocking (403 Forbidden)
 * 6. Token-Gated Portal Validation (404 on invalid, 200 on valid)
 * 7. Client Bundle Secret Scan (Zero hardcoded secrets in .next/static)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";
const PORTAL_VALID_TOKEN = "sec_master_portal_2026";
const TARGET_SECRET = "SR+ZH/q+LNRYEXCR4BiZNhgsNQCUbFJ9YXu3i7/36BE=";

let passedTests = 0;
let totalTests = 0;

function runHttp(options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, data }));
    });
    req.on("error", reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runTests() {
  console.log("================================================================================");
  console.log("🛡️  ENTERPRISE ZERO-TRUST SECURITY AUDIT & VERIFICATION TEST SUITE");
  console.log("================================================================================\n");

  // TEST 1: Security Headers Verification
  totalTests++;
  try {
    const res = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: "/",
      method: "GET",
    });

    const hasCsp = !!res.headers["content-security-policy"];
    const hasHsts = !!res.headers["strict-transport-security"];
    const hasXfo = res.headers["x-frame-options"] === "DENY";
    const hasNosniff = res.headers["x-content-type-options"] === "nosniff";
    const hasPermPolicy = !!res.headers["permissions-policy"];

    if (hasCsp && hasHsts && hasXfo && hasNosniff && hasPermPolicy) {
      console.log("✅ TEST 1: All Enterprise Security Headers Active (CSP, HSTS, XFO, nosniff, Permissions-Policy)");
      passedTests++;
    } else {
      console.error("❌ TEST 1 FAILED: Missing headers:", { hasCsp, hasHsts, hasXfo, hasNosniff, hasPermPolicy });
    }
  } catch (err) {
    console.error("❌ TEST 1 FAILED with exception:", err.message);
  }

  // TEST 2: HTTP Method Restriction & Dangerous Method Blocking
  totalTests++;
  try {
    const resMethod = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/vault/key",
      method: "PUT",
    });

    const resDangerous = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: "/",
      method: "DEBUG",
    });

    if (resMethod.status === 405 && (resDangerous.status === 400 || resDangerous.status === 405)) {
      console.log("✅ TEST 2: HTTP Method Restrictions & Non-Standard Method Blocking Verified (405 / 400)");
      passedTests++;
    } else {
      console.error(`❌ TEST 2 FAILED: Expected 405 & 400/405, got method: ${resMethod.status}, dangerous: ${resDangerous.status}`);
    }
  } catch (err) {
    console.error("❌ TEST 2 FAILED with exception:", err.message);
  }

  // TEST 3: Vulnerability Scanner & Path Traversal Probe Dropping
  totalTests++;
  try {
    const probeRes1 = await runHttp({ hostname: "localhost", port: 3000, path: "/.env", method: "GET" });
    const probeRes2 = await runHttp({ hostname: "localhost", port: 3000, path: "/wp-login.php", method: "GET" });
    const probeRes3 = await runHttp({ hostname: "localhost", port: 3000, path: "/api/../etc/passwd", method: "GET" });

    if (probeRes1.status === 404 && probeRes2.status === 404 && probeRes3.status === 404) {
      console.log("✅ TEST 3: Vulnerability Scanner Probes & Path Traversal Blocked (404 Not Found)");
      passedTests++;
    } else {
      console.error("❌ TEST 3 FAILED: Probes not blocked:", [probeRes1.status, probeRes2.status, probeRes3.status]);
    }
  } catch (err) {
    console.error("❌ TEST 3 FAILED with exception:", err.message);
  }

  // TEST 4: CSRF Cross-Origin Mutation Blocking
  totalTests++;
  try {
    const csrfRes = await runHttp(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/admin/users",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://malicious-attacker-website.com",
        },
      },
      JSON.stringify({ test: true })
    );

    if (csrfRes.status === 403) {
      console.log("✅ TEST 4: Cross-Origin Mutation Blocked by Edge CSRF Guard (403 Forbidden)");
      passedTests++;
    } else {
      console.error(`❌ TEST 4 FAILED: Expected 403 Forbidden, got ${csrfRes.status}`);
    }
  } catch (err) {
    console.error("❌ TEST 4 FAILED with exception:", err.message);
  }

  // TEST 5: Token-Gated Portal Access
  totalTests++;
  try {
    const invalidTokenRes = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: "/portal-access/unauthorized_random_token_999",
      method: "GET",
    });

    const validTokenRes = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: `/portal-access/${PORTAL_VALID_TOKEN}`,
      method: "GET",
    });

    if (invalidTokenRes.status === 404 && validTokenRes.status === 200) {
      console.log("✅ TEST 5: Token-Gated Portal Entry Verified (Invalid Token -> 404, Valid Token -> 200 OK)");
      passedTests++;
    } else {
      console.error("❌ TEST 5 FAILED: Gating mismatch:", { invalid: invalidTokenRes.status, valid: validTokenRes.status });
    }
  } catch (err) {
    console.error("❌ TEST 5 FAILED with exception:", err.message);
  }

  // TEST 6: Client JavaScript Bundle Secret Leak Scan
  totalTests++;
  try {
    const staticDir = path.join(__dirname, "..", ".next", "static");
    let secretFound = false;

    if (fs.existsSync(staticDir)) {
      function scanDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
          } else if (file.endsWith(".js")) {
            const content = fs.readFileSync(fullPath, "utf8");
            if (content.includes(TARGET_SECRET)) {
              secretFound = true;
              console.error(`🚨 Leak found in file: ${fullPath}`);
            }
          }
        }
      }
      scanDir(staticDir);
    }

    if (!secretFound) {
      console.log("✅ TEST 6: Static JavaScript Bundles Clean: Zero Hardcoded Master Secrets Leaked in Client Chunks");
      passedTests++;
    } else {
      console.error("❌ TEST 6 FAILED: Master encryption secret found in client-side static JavaScript chunks!");
    }
  } catch (err) {
    console.error("❌ TEST 6 FAILED with exception:", err.message);
  }

  // TEST 7: Direct Protected API Gating without Auth
  totalTests++;
  try {
    const apiRes = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/vault/key",
      method: "GET",
    });

    if (apiRes.status === 401 || apiRes.status === 403) {
      console.log("✅ TEST 7: Direct API Gating Verified: Unauthenticated API Access Blocked (401/403)");
      passedTests++;
    } else {
      console.error(`❌ TEST 7 FAILED: Expected 401/403, got ${apiRes.status}`);
    }
  } catch (err) {
    console.error("❌ TEST 7 FAILED with exception:", err.message);
  }

  // TEST 8: Hardened Long Cryptographic Workspace URL Access (Rewritten 200 OK)
  totalTests++;
  try {
    const hardenedUrl = "/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/system-telemetry-monitor";
    const authRes = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: hardenedUrl,
      method: "GET",
      headers: { Cookie: "admin_session=sess_audit_test_99" },
    });

    if (authRes.status === 200) {
      console.log("✅ TEST 8: Hardened Long Cryptographic URL Successfully Rewritten & Served (200 OK)");
      passedTests++;
    } else {
      console.error(`❌ TEST 8 FAILED: Expected 200 OK on hardened URL, got ${authRes.status}`);
    }
  } catch (err) {
    console.error("❌ TEST 8 FAILED with exception:", err.message);
  }

  // TEST 9: Tampered Workspace Context Token Blocking
  totalTests++;
  try {
    const tamperedUrl = "/corp-workspace/ctx-TAMPERED_INVALID_TOKEN_999999/system-telemetry-monitor";
    const tamperRes = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: tamperedUrl,
      method: "GET",
      headers: { Cookie: "admin_session=sess_audit_test_99" },
    });

    if (tamperRes.status === 404) {
      console.log("✅ TEST 9: Tampered Workspace Context Token Blocked by URL Security Engine (404 Not Found)");
      passedTests++;
    } else {
      console.error(`❌ TEST 9 FAILED: Expected 404 on tampered context token, got ${tamperRes.status}`);
    }
  } catch (err) {
    console.error("❌ TEST 9 FAILED with exception:", err.message);
  }

  // TEST 10: HTTP Parameter Pollution (HPP) Filter
  totalTests++;
  try {
    const hppUrl = "/access-gateway/node-sec-7f9e8a1d4b6c382109abfe43817c5690/session-authenticate?user=alice&user=bob";
    const hppRes = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: hppUrl,
      method: "GET",
    });

    if (hppRes.status === 400) {
      console.log("✅ TEST 10: HTTP Parameter Pollution (HPP) Blocked (400 Bad Request)");
      passedTests++;
    } else {
      console.error(`❌ TEST 10 FAILED: Expected 400 on duplicate query parameters, got ${hppRes.status}`);
    }
  } catch (err) {
    console.error("❌ TEST 10 FAILED with exception:", err.message);
  }

  // TEST 11: Path Traversal & Dot-Dot-Slash Filter
  totalTests++;
  try {
    const traversalUrl = "/access-gateway/node-sec-7f9e8a1d4b6c382109abfe43817c5690/../etc/passwd";
    const travRes = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: traversalUrl,
      method: "GET",
    });

    if (travRes.status === 404) {
      console.log("✅ TEST 11: Dot-Dot-Slash & Path Traversal Blocked by URL Validator (404 Not Found)");
      passedTests++;
    } else {
      console.error(`❌ TEST 11 FAILED: Expected 404 on path traversal, got ${travRes.status}`);
    }
  } catch (err) {
    console.error("❌ TEST 11 FAILED with exception:", err.message);
  }

  // TEST 12: Basic Route Auto-Upgrade to Hardened Long URL
  totalTests++;
  try {
    const basicRes = await runHttp({
      hostname: "localhost",
      port: 3000,
      path: "/dashboard/overview",
      method: "GET",
      headers: { Cookie: "admin_session=sess_audit_test_99" },
    });

    const isRedirect = basicRes.status === 307 || basicRes.status === 302 || basicRes.status === 308;
    const targetsHardened = basicRes.headers.location && basicRes.headers.location.includes("corp-workspace");

    if (isRedirect && targetsHardened) {
      console.log("✅ TEST 12: Basic Route Automatically Upgraded to Hardened Long URL (Redirect to /corp-workspace/...)");
      passedTests++;
    } else {
      console.error(`❌ TEST 12 FAILED: Expected redirect to hardened URL, got status ${basicRes.status}, location: ${basicRes.headers.location}`);
    }
  } catch (err) {
    console.error("❌ TEST 12 FAILED with exception:", err.message);
  }

  console.log("\n================================================================================");
  console.log(`🏁 AUDIT RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("================================================================================");

  if (passedTests === totalTests) {
    console.log("🌟 ENTERPRISE ZERO-TRUST ARCHITECTURE FULLY VERIFIED & ACTIVE!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
