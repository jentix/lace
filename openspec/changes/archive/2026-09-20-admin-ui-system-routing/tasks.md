## 1. Admin application setup

- [x] 1.1 Add the pinned React/Vite, TanStack Router/Query, Tailwind, Radix, and DOM-test dependencies plus admin build, development, typecheck, lint, and test scripts; verify a clean `pnpm --filter @lacecms/app-admin run build` emits the browser bundle.
- [x] 1.2 Add the Vite entry and `/admin` base-path configuration, preserving the browser-only package boundary; verify the Node development gateway serves an admin deep-link to the configured Vite upstream while API and health paths remain local.

## 2. Lace UI system

- [x] 2.1 Define semantic color, typography, spacing, radius, focus, and motion tokens with global reduced-motion and narrow-shell styles; verify focused DOM/CSS tests cover visible focus and reduced-motion rules.
- [x] 2.2 Implement owned Button, Input, Select, Dialog, Toast, Table, Badge, Skeleton, EmptyState, and ErrorState components that wrap behavior primitives without exposing unstyled third-party controls; verify isolated component tests cover labels, keyboard operation, dialog focus handling, and representative states.

## 3. Routing and session boundary

- [x] 3.1 Implement a fail-closed same-origin session source and typed TanStack Router route tree for login, content, model, entry, media, builds, users, and settings; verify route tests cover the required paths and invalid model-key not-found behavior without protected data requests.
- [x] 3.2 Implement the responsive shell and declarative role-aware navigation, including pending session, anonymous login redirect with a safe return path, authenticated-login redirect, and direct non-admin access-denied routes; verify focused tests prove no protected content flashes and admin/editor/viewer affordances match the role matrix.

## 4. Verification and change hygiene

- [x] 4.1 Run the focused admin and Node-gateway tests, then `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate admin-ui-system-routing --type change --strict`; resolve every failure and record no incomplete task.
