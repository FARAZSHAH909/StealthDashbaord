/**
 * ROLE-BASED ACCESS CONTROL (RBAC) DEFINITION
 */

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  READ_ONLY: "read_only",
};

export const PERMISSIONS = {
  // Data viewing
  VIEW_MESSAGES: "view_messages",
  VIEW_ANALYTICS: "view_analytics",
  VIEW_DEVICES: "view_devices",
  VIEW_APPLICATIONS: "view_applications",
  VIEW_SYNC_LOGS: "view_sync_logs",

  // Key operations
  UNLOCK_KEY_VAULT: "unlock_key_vault",

  // Administrative
  MANAGE_DEVICES: "manage_devices",
  REVOKE_DEVICE: "revoke_device",
  MANAGE_USERS: "manage_users",
  ASSIGN_ROLES: "assign_roles",
  VIEW_SECURITY_AUDIT: "view_security_audit",
  CONFIGURE_SECURITY_RULES: "configure_security_rules",
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_MESSAGES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_DEVICES,
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.VIEW_SYNC_LOGS,
    PERMISSIONS.UNLOCK_KEY_VAULT,
    PERMISSIONS.MANAGE_DEVICES,
    PERMISSIONS.VIEW_SECURITY_AUDIT,
  ],
  [ROLES.READ_ONLY]: [
    PERMISSIONS.VIEW_MESSAGES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_DEVICES,
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.VIEW_SYNC_LOGS,
    PERMISSIONS.UNLOCK_KEY_VAULT,
  ],
};

export function hasPermission(userRole, permission) {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

