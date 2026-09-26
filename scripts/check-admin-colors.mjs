import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createScanner, LanguageVariant, SyntaxKind } from "typescript/unstable/ast";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(scriptDirectory, "..");
const adminSource = join("apps", "admin", "src");
// The theme file is the only admin source allowed to define color values.
const themeFile = "theme.css";
const checkedExtensions = new Set([".ts", ".tsx", ".css"]);

const namedColors = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue " +
    "blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk " +
    "crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki " +
    "darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
    "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue " +
    "dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite " +
    "gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
    "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen " +
    "lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen " +
    "magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
    "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream " +
    "mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
    "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
    "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
    "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen " +
    "steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
  ).split(" "),
);
const namedColorPattern = [...namedColors].join("|");

const hexColor = /(?<![a-z0-9&#-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
const colorFunction = /(?<![a-z0-9-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/gi;
const paletteUtility = new RegExp(
  "(?<![\\w-])(?:bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|inset-ring|outline|fill|stroke|" +
    "from|via|to|divide|decoration|shadow|inset-shadow|drop-shadow|accent|caret|placeholder)-" +
    "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|" +
    "blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\\d{2,3})?(?:\\/\\d+)?(?![\\w-])",
  "g",
);
const arbitraryNamedColor = new RegExp(`-\\[(?:${namedColorPattern})\\]`, "gi");
const namedColorWord = new RegExp(`(?<![\\w-])(?:${namedColorPattern})(?![\\w-])`, "gi");

function collectFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(entryPath));
    if (entry.isFile() && checkedExtensions.has(extname(entry.name))) files.push(entryPath);
  }
  return files;
}

function isExempt(sourceDirectory, filePath) {
  const path = relative(sourceDirectory, filePath).split(sep).join("/");
  return (
    path === themeFile ||
    path.startsWith("test/") ||
    /\.test\.tsx?$/.test(path) ||
    /\.e2e\.ts$/.test(path)
  );
}

function lineAt(text, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (text.charCodeAt(index) === 10) line += 1;
  return line;
}

function matchesIn(value, patterns) {
  const found = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of value.matchAll(pattern)) found.push({ index: match.index, text: match[0] });
  }
  return found;
}

const expressionEnds = new Set([
  SyntaxKind.Identifier,
  SyntaxKind.CloseParenToken,
  SyntaxKind.CloseBracketToken,
  SyntaxKind.CloseBraceToken,
  SyntaxKind.NumericLiteral,
  SyntaxKind.StringLiteral,
  SyntaxKind.NoSubstitutionTemplateLiteral,
  SyntaxKind.TemplateTail,
  SyntaxKind.ThisKeyword,
]);
const stringTokens = new Set([
  SyntaxKind.StringLiteral,
  SyntaxKind.NoSubstitutionTemplateLiteral,
  SyntaxKind.TemplateHead,
  SyntaxKind.TemplateMiddle,
  SyntaxKind.TemplateTail,
]);

// Yields the contents of string and template literals so identifiers, private
// fields, and comments never count as color literals.
function stringLiteralsIn(text) {
  const literals = [];
  const scanner = createScanner(true, LanguageVariant.JSX, text);
  const templateBraces = [];
  let previous = SyntaxKind.Unknown;
  let token = scanner.scan();
  while (token !== SyntaxKind.EndOfFile) {
    if (
      (token === SyntaxKind.SlashToken || token === SyntaxKind.SlashEqualsToken) &&
      !expressionEnds.has(previous)
    )
      token = scanner.reScanSlashToken();
    if (token === SyntaxKind.OpenBraceToken && templateBraces.length > 0)
      templateBraces[templateBraces.length - 1] += 1;
    else if (token === SyntaxKind.CloseBraceToken && templateBraces.length > 0) {
      if (templateBraces.at(-1) === 0) {
        templateBraces.pop();
        token = scanner.reScanTemplateToken(false);
      } else templateBraces[templateBraces.length - 1] -= 1;
    }
    if (token === SyntaxKind.TemplateHead || token === SyntaxKind.TemplateMiddle)
      templateBraces.push(0);
    if (stringTokens.has(token) && !scanner.isUnterminated())
      literals.push({ start: scanner.getTokenStart(), value: scanner.getTokenValue() });
    previous = token;
    token = scanner.scan();
  }
  return literals;
}

function scriptViolations(text) {
  const violations = [];
  for (const literal of stringLiteralsIn(text)) {
    const found = matchesIn(literal.value, [
      hexColor,
      colorFunction,
      paletteUtility,
      arbitraryNamedColor,
    ]);
    if (namedColors.has(literal.value.trim().toLowerCase()))
      found.push({ index: 0, text: literal.value.trim() });
    for (const match of found)
      violations.push({ line: lineAt(text, literal.start), text: match.text });
  }
  return violations;
}

function styleViolations(text) {
  const source = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
  const violations = [];
  for (const declaration of source.matchAll(/(?:^|[;{\s])([\w-]+)\s*:\s*([^;{}]+)/g)) {
    const valueOffset = declaration.index + declaration[0].length - declaration[2].length;
    for (const match of matchesIn(declaration[2], [hexColor, colorFunction, namedColorWord]))
      violations.push({ line: lineAt(source, valueOffset + match.index), text: match.text });
  }
  for (const apply of source.matchAll(/@apply\s+([^;]+)/g))
    for (const match of matchesIn(apply[1], [hexColor, colorFunction, paletteUtility]))
      violations.push({ line: lineAt(source, apply.index), text: match.text });
  return violations;
}

export function checkAdminColors(rootDirectory = defaultRoot) {
  const sourceDirectory = join(rootDirectory, adminSource);
  if (!existsSync(sourceDirectory)) return [];
  const violations = [];
  for (const filePath of collectFiles(sourceDirectory)) {
    if (isExempt(sourceDirectory, filePath)) continue;
    const text = readFileSync(filePath, "utf8");
    const found = extname(filePath) === ".css" ? styleViolations(text) : scriptViolations(text);
    for (const violation of found)
      violations.push(
        `${relative(rootDirectory, filePath)}:${violation.line}: raw color literal "${violation.text}"`,
      );
  }
  return violations;
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = checkAdminColors(process.argv[2] ? resolve(process.argv[2]) : defaultRoot);
  if (violations.length > 0) {
    process.stderr.write(
      `${violations.join("\n")}\nUse admin theme tokens instead of raw color literals.\n`,
    );
    process.exit(1);
  }
}
