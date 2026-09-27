import type { AdminRole } from "./session.js";

/** Roles in descending order of access, as offered by role pickers. */
export const roleOptions: readonly AdminRole[] = ["admin", "editor", "viewer"];

const labels: Readonly<Record<AdminRole, string>> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const descriptions: Readonly<Record<AdminRole, string>> = {
  admin: "Publishes content and manages users and settings.",
  editor: "Edits drafts and uploads media.",
  viewer: "Reads content and media without making changes.",
};

/** The human name of a role, shared by the user menu, users table, and pickers. */
export function roleLabel(role: AdminRole): string {
  return labels[role];
}

/** A one-sentence summary of what a role can do. */
export function roleDescription(role: AdminRole): string {
  return descriptions[role];
}

export function isAdminRole(value: string): value is AdminRole {
  return (roleOptions as readonly string[]).includes(value);
}
