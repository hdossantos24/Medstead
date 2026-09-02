export const STAFF_ROLES = ["ADMIN", "STAFF", "PILOT", "CARGO"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const USER_ROLES = ["CUSTOMER", ...STAFF_ROLES] as const;
export type UserRoleName = (typeof USER_ROLES)[number];

export const PERMISSIONS = [
  "manage_employees",
  "assign_work",
  "update_tracking",
  "issue_invoice",
  "view_all_bookings",
  "view_cargo_queue",
  "view_trips",
  "manage_schedule",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const DEFAULT_RULES: Record<StaffRole, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  STAFF: ["update_tracking", "issue_invoice", "view_all_bookings", "assign_work"],
  PILOT: ["view_trips"],
  CARGO: ["update_tracking", "view_cargo_queue", "view_all_bookings"],
};

/** Break-glass OPS_PIN: tracking + invoice only. Not people or schedule. */
export const PIN_PERMISSIONS: Permission[] = ["update_tracking", "issue_invoice", "view_all_bookings"];

export const ROLE_LABEL: Record<UserRoleName, string> = {
  CUSTOMER: "Customer",
  ADMIN: "Admin",
  STAFF: "Staff",
  PILOT: "Pilot",
  CARGO: "Cargo",
};

export const ROLE_EYEBROW: Record<StaffRole, string> = {
  ADMIN: "Admin · ops overview",
  STAFF: "Staff · orders & packages",
  PILOT: "Pilot · trip assignments",
  CARGO: "Cargo · warehouse queue",
};

export const ASSIGNMENT_KINDS = ["NEXT_ACTION", "TRACKING_UPDATE", "INVOICE", "RECEIVE_CARGO", "FLIGHT_TRIP"] as const;
export type AssignmentKindName = (typeof ASSIGNMENT_KINDS)[number];

export const ASSIGNMENT_KIND_LABEL: Record<AssignmentKindName, string> = {
  NEXT_ACTION: "Next action",
  TRACKING_UPDATE: "Update tracking",
  INVOICE: "Invoice",
  RECEIVE_CARGO: "Receive cargo",
  FLIGHT_TRIP: "Trip assignment",
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  manage_employees: "Create and edit employees",
  assign_work: "Assign next actions",
  update_tracking: "Update tracking",
  issue_invoice: "Issue invoice / pay later",
  view_all_bookings: "See the orders & packages queue",
  view_cargo_queue: "Warehouse / cargo lane",
  view_trips: "Trip assignments",
  manage_schedule: "Edit shared cargo/passenger schedule",
};

export function isStaffRole(role?: string | null): role is StaffRole {
  return Boolean(role && (STAFF_ROLES as readonly string[]).includes(role));
}

export function homePathForRole(role?: string | null) {
  if (role === "ADMIN") return "/ops";
  if (role === "STAFF") return "/ops/orders";
  if (role === "PILOT") return "/ops/trips";
  if (role === "CARGO") return "/ops/orders?lane=cargo";
  return "/account";
}

export function mapImportedEmployeeRole(raw?: string | null): StaffRole | null {
  const v = (raw ?? "").toLowerCase().trim();
  if (!v) return null;
  if (["admin", "superadmin", "super_admin", "medstead_admin", "owner"].includes(v)) return "ADMIN";
  if (v === "pilot") return "PILOT";
  if (["cargo", "warehouse"].includes(v)) return "CARGO";
  if (["staff", "employee", "ops"].includes(v)) return "STAFF";
  if (v.includes("admin")) return "ADMIN";
  if (v.includes("pilot")) return "PILOT";
  if (v.includes("cargo") || v.includes("warehouse")) return "CARGO";
  if (v.includes("staff") || v.includes("ops")) return "STAFF";
  return null;
}

export function defaultAllowed(role: StaffRole, key: Permission) {
  return DEFAULT_RULES[role].includes(key);
}

export function ruleAllowed(
  role: string,
  key: Permission,
  stored: Array<{ role: string; key: string; allowed: boolean }>,
) {
  if (!isStaffRole(role)) return false;
  const hit = stored.find((r) => r.role === role && r.key === key);
  if (hit) return hit.allowed;
  return defaultAllowed(role, key);
}

export const CARGO_LANE_STATUSES = ["PAID", "RECEIVED", "IN_TRANSIT", "CUSTOMS", "READY_PICKUP"] as const;
