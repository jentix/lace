## ADDED Requirements

### Requirement: Every admin route passes automated accessibility checks
The browser test suite SHALL run an automated accessibility audit using the
WCAG 2.0, 2.1, and 2.2 level A and AA rules against every admin route once it
has finished loading: sign-in, the content home, a collection list, the entry
editor for a page and for a collection entry, the media library, Builds,
Users, Settings, the access-denied state, and the not-found route. It SHALL
also audit the main dialogs while they are open: the add-block menu, the media
picker, the publication confirmation, the create-user dialog, and the
build-token dialog including its once-shown token step. Any violation SHALL
fail the suite and report the rule and the affected elements. No rule SHALL be
disabled globally; a rule MAY be excluded only for a named third-party element
with a recorded reason.

#### Scenario: A route is audited
- **WHEN** the accessibility suite opens an admin route and its loading state
  has resolved
- **THEN** the audit reports no WCAG A or AA violation for that route

#### Scenario: A dialog is audited
- **WHEN** the suite opens one of the main dialogs
- **THEN** the audit of the page with the dialog open reports no WCAG A or AA
  violation

#### Scenario: A violation is introduced
- **WHEN** an admin route renders a control without an accessible name or text
  below the required contrast
- **THEN** the accessibility suite fails and names the rule and the element

### Requirement: The main editorial flow completes with the keyboard alone
An administrator SHALL be able to sign in, reach a collection from the
navigation, open an entry, add a block, save the draft, publish it through the
confirmation dialog, and open and dismiss a Users dialog using only keyboard
input. Every control reached on that path SHALL show a visible focus
indication, dialogs SHALL move focus into themselves when opened, and closing a
dialog SHALL return focus to the control that opened it.

#### Scenario: Keyboard-only walkthrough
- **WHEN** a keyboard-only administrator performs the main editorial flow
  without a pointing device
- **THEN** every step completes, each focused control shows a visible focus
  indication, and focus returns to each dialog's opener when it closes
