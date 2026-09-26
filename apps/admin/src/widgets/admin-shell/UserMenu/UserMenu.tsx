import { ChevronsUpDown, LogOut } from "lucide-react";
import type { AdminRole } from "../../../entities/session/index.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../shared/ui/DropdownMenu/index.js";

const roleLabels: Readonly<Record<AdminRole, string>> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const neutralName = "Signed-in user";

/** Up to two initials from a display name, or the first letter of an email. */
function initialsOf(name: string | undefined): string {
  if (name === undefined) return "";
  const words = name.includes("@") ? [name] : name.split(/\s+/u).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** The signed-in user's name and role with the log out action; never shows the user ID. */
export function UserMenu({
  displayName,
  onSignOut,
  role,
  signingOut,
}: {
  readonly displayName?: string | undefined;
  readonly onSignOut: () => void;
  readonly role: AdminRole;
  readonly signingOut: boolean;
}) {
  const name = displayName ?? neutralName;
  const roleLabel = roleLabels[role];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${name}, ${roleLabel}, account menu`}
        className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md p-2 text-left text-sm transition-colors duration-(--duration-fast) hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground"
        >
          {initialsOf(displayName) || "?"}
        </span>
        <span className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate font-medium" title={name}>
            {name}
          </span>
          <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        side="top"
      >
        <DropdownMenuLabel className="grid font-normal">
          <span className="truncate font-medium" title={name}>
            {name}
          </span>
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signingOut} onSelect={onSignOut}>
          <LogOut aria-hidden="true" />
          {signingOut ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
