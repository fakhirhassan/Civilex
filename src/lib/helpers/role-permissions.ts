import type { Role } from "@/lib/constants";

export type Permission =
  | "cases.create"
  | "cases.view_own"
  | "cases.view_assigned"
  | "cases.view_all"
  | "cases.submit_to_admin"
  | "cases.scrutinize"
  | "cases.register"
  | "cases.conduct_hearing"
  | "cases.record_proceedings"
  | "cases.deliver_judgment"
  | "cases.transfer"
  | "documents.upload"
  | "documents.view"
  | "documents.sign"
  | "hearings.schedule"
  | "hearings.record"
  | "orders.create"
  | "payments.make"
  | "payments.receive"
  | "lawyers.browse"
  | "lawyers.accept_case";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  client: [
    "cases.create",
    "cases.view_own",
    "documents.view",
    "documents.sign",
    "payments.make",
    "lawyers.browse",
  ],
  lawyer: [
    "cases.view_assigned",
    "cases.submit_to_admin",
    "documents.upload",
    "documents.view",
    "documents.sign",
    "lawyers.accept_case",
    "payments.receive",
  ],
  admin_court: [
    "cases.view_all",
    "cases.scrutinize",
    "cases.register",
    "cases.transfer",
    "hearings.schedule",
    "documents.view",
  ],
  magistrate: [
    "cases.view_assigned",
    "cases.conduct_hearing",
    "orders.create",
    "documents.view",
    "hearings.schedule",
  ],
  trial_judge: [
    "cases.view_assigned",
    "cases.conduct_hearing",
    "cases.deliver_judgment",
    "orders.create",
    "hearings.schedule",
    "documents.view",
  ],
  stenographer: [
    "cases.view_assigned",
    "cases.record_proceedings",
    "hearings.record",
    "documents.view",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
