## MODIFIED Requirements

### Requirement: The admin application provides a coherent accessible UI system
The admin application SHALL provide Lace-owned Button, Input, Textarea, Select,
Dialog, Sheet, DropdownMenu, Popover, Tooltip, Toaster, Table, Tabs, Badge,
Skeleton, Calendar, ScrollArea, EmptyState, and ErrorState controls, styled
only through the `admin-design-system` color, typography, spacing, radius,
shadow, focus, and motion tokens using utility classes rather than hand-written
component CSS. Interactive controls SHALL have an accessible name, visible
keyboard focus indication, and contrast suitable for their state. The
application SHALL honour reduced-motion preferences and remain usable at narrow
viewport widths without requiring a horizontal page scroll.

#### Scenario: A keyboard user operates an owned control
- **WHEN** a keyboard-only user reaches an enabled owned control
- **THEN** the control exposes its accessible name, receives a visible focus
  indication drawn from the focus token, and can be operated without a pointing
  device

#### Scenario: Motion reduction is requested
- **WHEN** the browser reports a reduced-motion preference
- **THEN** the application suppresses non-essential transitions and animation

#### Scenario: The shell is viewed on a narrow screen
- **WHEN** an authenticated user opens the admin shell at a narrow viewport
- **THEN** navigation and route content remain reachable without horizontal
  page scrolling

#### Scenario: Owned controls are restyled through tokens
- **WHEN** a theme token value changes
- **THEN** every owned control using that token reflects the new value without
  a component source change

#### Scenario: A notification is raised
- **WHEN** admin code raises a notification through the Toaster
- **THEN** the notification is rendered in a polite live region and offers a
  dismiss control with an accessible name
