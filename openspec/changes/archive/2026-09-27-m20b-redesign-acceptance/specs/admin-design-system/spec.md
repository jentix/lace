## ADDED Requirements

### Requirement: Lint rejects arbitrary values that bypass design tokens
`pnpm lint` SHALL fail when admin application source outside the theme source
uses an arbitrary utility value in place of a typography, radius, shadow,
focus-width, or motion token: an arbitrary font size, border radius, box
shadow, ring or outline width, or transition duration, delay, or easing. An
arbitrary value that references a CSS custom property, or a radius of
`inherit`, SHALL be allowed. The failure SHALL name the file, line, and
offending class. Test files SHALL be exempt. Layout values such as widths,
grid tracks, and positions are outside this rule. The radius scale SHALL
include an extra-small step derived from the base radius so small decorations
need no arbitrary radius.

#### Scenario: A component sets an arbitrary font size
- **WHEN** an admin component contains the class `text-[0.8rem]`
- **THEN** `pnpm lint` fails and reports the file, line, and class

#### Scenario: A component sets an arbitrary radius or shadow
- **WHEN** an admin component contains `rounded-[2px]` or
  `shadow-[0_1px_2px]`
- **THEN** `pnpm lint` fails and reports each class

#### Scenario: A component uses token-backed or layout arbitrary values
- **WHEN** an admin component uses `text-sm`, `rounded-xs`,
  `rounded-[inherit]`, `min-w-[8rem]`, or `grid-cols-[auto_1fr]`
- **THEN** the token-bypass check does not report them
