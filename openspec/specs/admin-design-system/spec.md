# admin-design-system Specification

## Purpose

Defines the admin design-token contract, the rule that admin UI is styled only
through those tokens, and the lint gate that keeps raw color values out of admin
components, so later screens share one visual system that can gain dark mode.

## Requirements

### Requirement: Admin design tokens are defined in one theme contract
The admin application SHALL define its color, typography, spacing, radius,
shadow, focus, and motion values as CSS custom properties in a single theme
source. Color tokens SHALL use semantic surface/foreground pairs in the shadcn
naming convention, including at least `background`, `foreground`, `card`,
`popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`,
`input`, `ring`, the `sidebar` family, and Lace status pairs for success and
warning. Every foreground token SHALL meet WCAG 2.2 AA text contrast (4.5:1)
against its paired surface token in each shipped theme.

#### Scenario: A component needs a surface color
- **WHEN** an admin component renders a surface, text, border, or focus color
- **THEN** the value resolves from a named theme token rather than a value
  embedded in the component

#### Scenario: Paired tokens are checked for contrast
- **WHEN** each shipped foreground token is compared with its paired surface
  token
- **THEN** the contrast ratio is at least 4.5:1

### Requirement: The light theme ships under a dark-ready selector structure
The admin application SHALL ship exactly one theme, `light`, applied by default
and when the document root carries `data-theme="light"`. The theme source SHALL
scope theme values by a `data-theme` selector so that a later theme can supply
alternative token values without changing any component. The application SHALL
not ship dark theme values in the MVP.

#### Scenario: No theme attribute is present
- **WHEN** the admin document root has no `data-theme` attribute
- **THEN** every token resolves to its light theme value

#### Scenario: A future theme is added
- **WHEN** a maintainer adds a `data-theme` block with alternative token values
- **THEN** components adopt those values without source changes to the
  components

### Requirement: Admin typography uses self-hosted Inter at a 13px base
The admin application SHALL serve the Inter variable font from its own origin
without requesting a third-party font host, SHALL fall back to the system
sans-serif stack when the font is unavailable, and SHALL render body text at a
13px base size.

#### Scenario: The admin loads offline from a third-party font host
- **WHEN** the admin loads in a browser that cannot reach any external host
- **THEN** body text renders in Inter from the admin origin at 13px, or in the
  system sans-serif fallback if the font fails to load

### Requirement: Admin components are styled through utilities over tokens
Admin components SHALL be styled with utility classes that resolve to theme
tokens. The admin stylesheet SHALL contain only the theme source, font import,
utility framework setup, and element-level base rules (focus indication,
reduced motion, document defaults); it SHALL not contain component-specific
class rules. Utility color classes outside the token set SHALL not produce
styles.

#### Scenario: A default palette color class is used
- **WHEN** an admin component uses a utility color from the framework's
  default palette instead of a token
- **THEN** no color style is generated for that class and the lint gate
  reports it

### Requirement: Lint rejects raw color literals in admin components
`pnpm lint` SHALL fail when admin application source outside the theme source
contains a raw color literal: a hexadecimal color, a CSS color function, a CSS
named color used as a color value, an arbitrary utility value containing a
color literal, or a utility class naming a default palette color. The failure
SHALL name the file, line, and offending literal. Test files SHALL be exempt.
The theme source SHALL be the only admin file permitted to contain color
literals.

#### Scenario: A component embeds a hex color
- **WHEN** an admin component contains `className="bg-[#ff0000]"` or a style
  value `#ff0000`
- **THEN** `pnpm lint` fails and reports the file, line, and literal

#### Scenario: A component uses a default palette utility
- **WHEN** an admin component contains the class `text-red-600`
- **THEN** `pnpm lint` fails and reports the class

#### Scenario: Components use only token utilities
- **WHEN** admin components use only token-backed utilities and the theme
  source defines the color values
- **THEN** the color-literal check passes

#### Scenario: A non-color hash string is present
- **WHEN** admin source contains a string such as `"#root"` that is not a
  hexadecimal color
- **THEN** the color-literal check does not report it

### Requirement: Admin UI primitives are generated Lace-owned source
The admin application SHALL provide its generic UI primitives as source
generated from shadcn/ui on Radix primitives and committed to the admin shared
UI layer, one primitive per component folder. The primitives SHALL resolve every
color from theme tokens, SHALL not depend on a themed component library or an
animation plugin at runtime, and SHALL keep their accessible roles, names, and
keyboard behavior when adapted to Lace conventions. Buttons SHALL default to a
non-submitting type unless a caller requests submission.

#### Scenario: A generated primitive is inspected for color values
- **WHEN** the color-literal check scans the generated primitives
- **THEN** it reports no raw color literal, because overlay, destructive, and
  surface colors resolve from theme tokens

#### Scenario: A primitive button is placed inside a form
- **WHEN** a primitive button without an explicit type is activated inside a
  form
- **THEN** the form is not submitted

#### Scenario: A dialog primitive is opened from the keyboard
- **WHEN** a keyboard user opens a dialog built from the primitives and presses
  Escape
- **THEN** the dialog exposes its title as its accessible name, traps focus
  while open, closes on Escape, and returns focus to its trigger
