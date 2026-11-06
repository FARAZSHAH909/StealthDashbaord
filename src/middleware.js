import { NextResponse } from "next/server";
import { validateUrlPath, validateUrlParams } from "@/lib/security/urlSecurity";
import {
  HARDENED_ROUTES,
  ROUTE_CONTEXT_ID,
  GATEWAY_NODE_ID,
  ROUTE_REWRITE_MAP,
  REVERSE_ROUTE_MAP,
} from "@/lib/security/routesConfig";

// In-memory sliding window rate limiter for Edge Middleware
const rateLimitMap = new Map(); // ip -> { count, expiresAt }
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_AUTH_REQUESTS_PER_MIN = 30; // Max 30 attempts/min per IP

// Pre-configured portal master access token
const PORTAL_ACCESS_TOKEN = process.env.PORTAL_ACCESS_TOKEN || "sec_master_portal_2026";

/**
 * Extract trusted client IP from headers
 */
function getClientIp(request) {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",");
    return ips[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

/**
 * In-memory rate limiting check at the network edge
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.expiresAt) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_AUTH_REQUESTS_PER_MIN - 1 };
  }

  if (entry.count >= MAX_AUTH_REQUESTS_PER_MIN) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_AUTH_REQUESTS_PER_MIN - entry.count };
}

/**
 * Clean up expired rate limits periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.expiresAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Apply Enterprise Defense-in-Depth Security Headers
 */
function applySecurityHeaders(response, isProtectedAdminRoute = false) {
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.googleusercontent.com;
    font-src 'self';
    connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://*.googleapis.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, " ").trim();

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  if (isProtectedAdminRoute) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;
  const ip = getClientIp(request);

  // =========================================================================
  // 1. REJECT DANGEROUS / MALICIOUS HTTP METHODS (TRACE, TRACK, CONNECT, DEBUG)
  // =========================================================================
  const DISALLOWED_METHODS = ["TRACE", "TRACK", "CONNECT", "DEBUG"];
  if (DISALLOWED_METHODS.includes(method)) {
    return new NextResponse("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD" },
    });
  }

  // =========================================================================
  // 2. URL SECURITY ENGINE (Path Traversal, Null Bytes, Polyglots, HPP)
  // =========================================================================
  const pathValidation = validateUrlPath(pathname);
  if (!pathValidation.valid) {
    console.warn(`[URL Security] Dropped malformed path [${pathname}] from IP ${ip}: ${pathValidation.reason}`);
    return new NextResponse("Not Found", { status: 404 });
  }

  const paramsValidation = validateUrlParams(searchParams);
  if (!paramsValidation.valid) {
    console.warn(`[URL Security] Blocked suspicious URL parameters from IP ${ip}: ${paramsValidation.reason}`);
    return new NextResponse("Bad Request: Suspicious URL parameters detected", { status: 400 });
  }

  // =========================================================================
  // 3. ANTI-SCANNING & PROBE DETECTION (Drop known vulnerability scanners)
  // =========================================================================
  const SCANNER_PROBE_REGEX =
    /(\.(git|env|bak|config|sql|tar|gz|zip|yml|yaml|ini)($|\/)|(wp-login|wp-admin|phpmyadmin|pma|\.well-known\/pki|cgi-bin|autodiscover|actuator))/i;

  if (SCANNER_PROBE_REGEX.test(pathname) || pathname.includes("..")) {
    console.warn(`[Security Middleware] Blocked scanning probe from IP ${ip}: ${pathname}`);
    return new NextResponse("Not Found", { status: 404 });
  }

  // =========================================================================
  // 4. CSRF & ORIGIN VALIDATION (For mutating API requests)
  // =========================================================================
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method) && pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const forwardedHost = request.headers.get("x-forwarded-host");

    if (origin && host) {
      const cleanOrigin = origin.replace(/^https?:\/\//, "").split(":")[0];
      const cleanHost = host.split(":")[0];
      const cleanForwardedHost = forwardedHost ? forwardedHost.split(":")[0] : null;

      const isSameHost = cleanOrigin === cleanHost || (cleanForwardedHost && cleanOrigin === cleanForwardedHost);
      const isLocalhost = cleanOrigin === "localhost" || cleanOrigin === "127.0.0.1";
      const isTunnel = cleanOrigin.endsWith(".trycloudflare.com") || cleanOrigin.endsWith(".cloudflareaccess.com");

      if (!isSameHost && !isLocalhost && !isTunnel) {
        console.warn(`[Security Middleware] CSRF Mismatch: Origin ${origin} does not match Host ${host}`);
        return NextResponse.json({ error: "Cross-Origin Request Blocked" }, { status: 403 });
      }
    }
  }

  // =========================================================================
  // 5. RATE LIMITING FOR AUTH & SENSITIVE PATHS
  // =========================================================================
  const isAuthRoute =
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/portal-access") ||
    pathname.startsWith("/api/v1/auth/") ||
    pathname.includes("/session-authenticate");

  if (isAuthRoute) {
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      console.warn(`[Security Middleware] Rate limit exceeded for IP ${ip} on ${pathname}`);
      return NextResponse.json(
        { error: "Too many requests. Please wait 60 seconds before retrying." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  // Session Cookies & Zero Trust Assertions
  const sessionCookie =
    request.cookies.get("__Secure-AdminSession")?.value ||
    request.cookies.get("admin_session")?.value;
  const cfAssertion = request.headers.get("cf-access-jwt-assertion");
  const isAuthenticated = !!(sessionCookie || cfAssertion);

  // =========================================================================
  // 6. HARDENED ENTERPRISE WORKSPACE REWRITING & ACCESS CONTROL
  // =========================================================================
  if (pathname.startsWith("/corp-workspace/")) {
    const parts = pathname.split("/");
    const contextId = parts[2];

    // Cryptographic Context Entropy Validation
    if (contextId !== ROUTE_CONTEXT_ID) {
      console.warn(`[URL Security] Invalid workspace context token from IP ${ip}: ${contextId}`);
      return new NextResponse("Not Found", { status: 404 });
    }

    const internalTarget = ROUTE_REWRITE_MAP[pathname];
    if (!internalTarget) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Unauthenticated access redirects to hardened identity gateway
    if (!isAuthenticated) {
      const loginUrl = new URL(HARDENED_ROUTES.GATEWAY_LOGIN, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated: internally rewrite to Next.js dashboard component
    const rewriteUrl = new URL(internalTarget, request.url);
    rewriteUrl.search = request.nextUrl.search;
    const response = NextResponse.rewrite(rewriteUrl);
    return applySecurityHeaders(response, true);
  }

  // =========================================================================
  // 7. HARDENED IDENTITY GATEWAY REWRITING
  // =========================================================================
  if (pathname.startsWith("/access-gateway/")) {
    const parts = pathname.split("/");
    const nodeId = parts[2];

    if (nodeId !== GATEWAY_NODE_ID) {
      console.warn(`[URL Security] Invalid gateway node token from IP ${ip}: ${nodeId}`);
      return new NextResponse("Not Found", { status: 404 });
    }

    const internalTarget = ROUTE_REWRITE_MAP[pathname];
    if (!internalTarget) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const rewriteUrl = new URL(internalTarget, request.url);
    rewriteUrl.search = request.nextUrl.search;
    const response = NextResponse.rewrite(rewriteUrl);
    return applySecurityHeaders(response, false);
  }

  // =========================================================================
  // 8. DIRECT / BASIC ROUTE UPGRADE & PROTECTION
  // =========================================================================
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL(HARDENED_ROUTES.GATEWAY_LOGIN, request.url);
      const hardenedFrom = REVERSE_ROUTE_MAP[pathname] || pathname;
      loginUrl.searchParams.set("from", hardenedFrom);
      return NextResponse.redirect(loginUrl);
    }

    // Automatically upgrade authenticated basic routes to hardened cryptographic URLs
    const hardenedTarget = REVERSE_ROUTE_MAP[pathname];
    if (hardenedTarget) {
      const upgradedUrl = new URL(hardenedTarget, request.url);
      upgradedUrl.search = request.nextUrl.search;
      return NextResponse.redirect(upgradedUrl);
    }
  }

  if (pathname === "/login") {
    const upgradedUrl = new URL(HARDENED_ROUTES.GATEWAY_LOGIN, request.url);
    upgradedUrl.search = request.nextUrl.search;
    return NextResponse.redirect(upgradedUrl);
  }

  if (pathname === "/register") {
    const upgradedUrl = new URL(HARDENED_ROUTES.GATEWAY_REGISTER, request.url);
    upgradedUrl.search = request.nextUrl.search;
    return NextResponse.redirect(upgradedUrl);
  }

  // =========================================================================
  // 9. TOKEN-GATED PORTAL ENTRY VALIDATION
  // =========================================================================
  if (pathname.startsWith("/portal-access/")) {
    const token = pathname.replace("/portal-access/", "").split("/")[0];
    if (token !== PORTAL_ACCESS_TOKEN) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  // =========================================================================
  // 10. API ADMIN ACCESS CONTROL
  // =========================================================================
  if (pathname.startsWith("/api/admin") && !isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  // =========================================================================
  // 11. BUILD SECURE RESPONSE WITH ENTERPRISE HEADERS
  // =========================================================================
  const response = NextResponse.next();
  return applySecurityHeaders(response, pathname.startsWith("/dashboard"));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
