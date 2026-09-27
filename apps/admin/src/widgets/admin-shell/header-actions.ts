import { createContext } from "react";

/**
 * The shell header's page-actions element. `undefined` means no shell is
 * mounted (actions render inline); `null` means the header has not attached it yet.
 */
export const HeaderActionsTargetContext = createContext<HTMLElement | null | undefined>(undefined);
