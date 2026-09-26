import type { AdminRole } from "../../entities/session/index.js";

const sharedNavigation = [
  { label: "Content", path: "/content" },
  { label: "Media", path: "/media" },
  { label: "Builds", path: "/builds" },
] as const;
const adminNavigation = [
  { label: "Users", path: "/users" },
  { label: "Settings", path: "/settings" },
] as const;

/** Shell navigation items the role may open; route guards enforce the same matrix. */
export function navigationFor(role: AdminRole) {
  return role === "admin" ? [...sharedNavigation, ...adminNavigation] : [...sharedNavigation];
}
