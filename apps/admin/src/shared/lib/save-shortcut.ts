import { useEffect, useRef } from "react";

/** Whether the platform names its primary modifier ⌘ (Apple) rather than Ctrl. */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { readonly userAgentData?: { readonly platform?: string } })
      .userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad|ipod/iu.test(platform);
}

/** The visible hint for the save shortcut, e.g. "⌘S" or "Ctrl S". */
export function saveShortcutLabel(apple: boolean = isApplePlatform()): string {
  return apple ? "⌘S" : "Ctrl S";
}

/** The `aria-keyshortcuts` value for the save shortcut. */
export const saveShortcutKeys = "Meta+S Control+S";

/** Whether a key event is the save shortcut; either primary modifier is accepted. */
export function isSaveShortcut(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "s"
  );
}

/**
 * Handles ⌘S/Ctrl+S while mounted. The browser's page-save behavior is always
 * suppressed; `onSave` decides whether anything should be saved.
 */
export function useSaveShortcut(onSave: () => void): void {
  const latest = useRef(onSave);
  latest.current = onSave;
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!isSaveShortcut(event)) return;
      event.preventDefault();
      latest.current();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
