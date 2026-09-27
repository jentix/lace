import { useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HeaderActionsTargetContext } from "../header-actions.js";

/**
 * Places a screen's page-level actions in the shell header beside the
 * breadcrumbs. They unmount with the screen; outside a shell they render inline.
 */
export function ShellHeaderActions({ children }: { readonly children: ReactNode }) {
  const target = useContext(HeaderActionsTargetContext);
  if (target === undefined) return <>{children}</>;
  if (target === null) return null;
  return createPortal(children, target);
}
