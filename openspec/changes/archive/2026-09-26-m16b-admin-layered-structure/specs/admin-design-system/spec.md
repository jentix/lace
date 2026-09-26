## ADDED Requirements

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
