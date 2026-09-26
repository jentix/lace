import { expect, test } from "vitest";
import themeSource from "./theme.css?raw";

const source = themeSource.replace(/\/\*[\s\S]*?\*\//g, "");

function lightTokens(): Map<string, string> {
  const block = /:root,\s*:root\[data-theme="light"\]\s*\{([^}]*)\}/.exec(source);
  if (block === null) throw new Error("Light theme block is missing.");
  const tokens = new Map<string, string>();
  for (const match of block[1]!.matchAll(/--([\w-]+):\s*([^;]+);/g))
    tokens.set(match[1]!, match[2]!.trim());
  return tokens;
}

function luminance(value: string): number {
  const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value);
  if (match === null) throw new Error(`Unsupported color token value: ${value}`);
  const [lightness, chroma, hue] = match.slice(1).map(Number) as [number, number, number];
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (channel: number) => Math.min(1, Math.max(0, channel));
  const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

test("the theme defines every required token category", () => {
  const tokens = lightTokens();
  for (const name of [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "destructive-foreground",
    "success",
    "success-foreground",
    "warning",
    "warning-foreground",
    "border",
    "input",
    "ring",
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
    "radius",
    "focus-ring-width",
    "duration-fast",
    "duration-normal",
  ])
    expect(tokens.has(name), name).toBe(true);
  for (const namespace of ["--spacing:", "--text-sm:", "--shadow-sm:", "--ease-standard:"])
    expect(source).toContain(namespace);
  expect(source).toContain('--font-sans: "Inter Variable"');
  expect(source).toContain("--text-sm: 0.8125rem;");
});

test("light is the only shipped theme and dark stays selector-ready", () => {
  expect(source).not.toMatch(/\[data-theme="dark"\]\s*\{/);
  expect(source).toContain('@custom-variant dark (&:where([data-theme="dark"]');
});

test("every foreground token meets AA contrast on its surface", () => {
  const tokens = lightTokens();
  const pairs: Array<[string, string]> = [
    ["foreground", "background"],
    ["card-foreground", "card"],
    ["popover-foreground", "popover"],
    ["primary-foreground", "primary"],
    ["secondary-foreground", "secondary"],
    ["muted-foreground", "muted"],
    ["muted-foreground", "background"],
    ["accent-foreground", "accent"],
    ["destructive-foreground", "destructive"],
    ["destructive", "background"],
    ["success-foreground", "success"],
    ["warning-foreground", "warning"],
    ["sidebar-foreground", "sidebar"],
    ["sidebar-primary-foreground", "sidebar-primary"],
    ["sidebar-accent-foreground", "sidebar-accent"],
    ["muted-foreground", "sidebar"],
  ];
  for (const [foreground, background] of pairs)
    expect(
      contrast(tokens.get(foreground)!, tokens.get(background)!),
      `${foreground} on ${background}`,
    ).toBeGreaterThanOrEqual(4.5);
});

test("global styles expose the light theme focus and motion tokens", async () => {
  await import("./styles.css");
  const rootStyles = getComputedStyle(document.documentElement);
  expect(rootStyles.getPropertyValue("--ring").trim()).toMatch(/^oklch\(/);
  expect(rootStyles.getPropertyValue("--primary").trim()).toMatch(/^oklch\(/);
  expect(rootStyles.getPropertyValue("--duration-normal").trim()).toBe("220ms");
});
