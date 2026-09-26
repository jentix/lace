import { renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { isSaveShortcut, saveShortcutLabel, useSaveShortcut } from "./save-shortcut.js";

function press(init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", { cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
}

test("the save shortcut prevents page save and calls the latest handler", () => {
  const first = vi.fn();
  const second = vi.fn();
  const { rerender, unmount } = renderHook(({ onSave }) => useSaveShortcut(onSave), {
    initialProps: { onSave: first },
  });
  rerender({ onSave: second });
  const control = press({ ctrlKey: true, key: "s" });
  const meta = press({ key: "S", metaKey: true });
  expect(control.defaultPrevented).toBe(true);
  expect(meta.defaultPrevented).toBe(true);
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(2);
  unmount();
  expect(press({ ctrlKey: true, key: "s" }).defaultPrevented).toBe(false);
});

test("other modifier combinations are not the save shortcut", () => {
  const onSave = vi.fn();
  renderHook(() => useSaveShortcut(onSave));
  expect(press({ key: "s" }).defaultPrevented).toBe(false);
  expect(press({ ctrlKey: true, key: "s", shiftKey: true }).defaultPrevented).toBe(false);
  expect(press({ altKey: true, key: "s", metaKey: true }).defaultPrevented).toBe(false);
  expect(press({ ctrlKey: true, key: "d" }).defaultPrevented).toBe(false);
  expect(onSave).not.toHaveBeenCalled();
  expect(isSaveShortcut(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }))).toBe(true);
});

test("the shortcut hint names the platform modifier", () => {
  expect(saveShortcutLabel(true)).toBe("⌘S");
  expect(saveShortcutLabel(false)).toBe("Ctrl S");
});
