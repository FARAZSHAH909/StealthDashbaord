/**
 * ENTERPRISE CRYPTOGRAPHIC ROUTE CONFIGURATION
 * 
 * Replaces basic and predictable route paths with high-entropy,
 * long-length, non-guessable enterprise namespaces.
 */

export const ROUTE_CONTEXT_ID = "ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810";
export const GATEWAY_NODE_ID = "node-sec-7f9e8a1d4b6c382109abfe43817c5690";

export const HARDENED_ROUTES = {
  // Public Identity Gateways
  GATEWAY_LOGIN: `/access-gateway/${GATEWAY_NODE_ID}/session-authenticate`,
  GATEWAY_REGISTER: `/access-gateway/${GATEWAY_NODE_ID}/enrollment-redemption`,
  
  // Hardened Private Workspace
  OVERVIEW: `/corp-workspace/${ROUTE_CONTEXT_ID}/system-telemetry-monitor`,
  MESSAGES: `/corp-workspace/${ROUTE_CONTEXT_ID}/encrypted-stream-terminal`,
  CONVERSATIONS: `/corp-workspace/${ROUTE_CONTEXT_ID}/channel-directory-index`,
  DEVICES: `/corp-workspace/${ROUTE_CONTEXT_ID}/hardware-fleet-inventory`,
  APPLICATIONS: `/corp-workspace/${ROUTE_CONTEXT_ID}/managed-workload-catalog`,
  APP_UPDATES: `/corp-workspace/${ROUTE_CONTEXT_ID}/application-release-deployment`,
  SYNC_LOGS: `/corp-workspace/${ROUTE_CONTEXT_ID}/replication-audit-journal`,
  ANALYTICS: `/corp-workspace/${ROUTE_CONTEXT_ID}/metric-aggregation-engine`,
  SECURITY: `/corp-workspace/${ROUTE_CONTEXT_ID}/audit-surveillance-ledger`,
  USERS: `/corp-workspace/${ROUTE_CONTEXT_ID}/identity-access-directory`,
};

// Bi-directional mapping between hardened URLs and internal Next.js filesystem routes
export const ROUTE_REWRITE_MAP = {
  [HARDENED_ROUTES.GATEWAY_LOGIN]: "/login",
  [HARDENED_ROUTES.GATEWAY_REGISTER]: "/register",
  [HARDENED_ROUTES.OVERVIEW]: "/dashboard/overview",
  [HARDENED_ROUTES.MESSAGES]: "/dashboard/messages",
  [HARDENED_ROUTES.CONVERSATIONS]: "/dashboard/conversations",
  [HARDENED_ROUTES.DEVICES]: "/dashboard/devices",
  [HARDENED_ROUTES.APPLICATIONS]: "/dashboard/applications",
  [HARDENED_ROUTES.APP_UPDATES]: "/dashboard/app-updates",
  [HARDENED_ROUTES.SYNC_LOGS]: "/dashboard/sync-logs",
  [HARDENED_ROUTES.ANALYTICS]: "/dashboard/analytics",
  [HARDENED_ROUTES.SECURITY]: "/dashboard/security",
  [HARDENED_ROUTES.USERS]: "/dashboard/users",
};

export const REVERSE_ROUTE_MAP = Object.entries(ROUTE_REWRITE_MAP).reduce((acc, [hardened, internal]) => {
  acc[internal] = hardened;
  return acc;
}, {});
