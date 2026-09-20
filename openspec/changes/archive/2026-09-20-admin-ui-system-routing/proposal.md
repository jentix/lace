## Why

Step 11 begins the browser-facing CMS experience. The repository currently has
only an admin-package skeleton, so users cannot enter a coherent, accessible
admin application or navigate its planned client routes.

This change implements roadmap Step 11, Session 11A. It establishes the
visual, routing, and session-boundary foundation that Session 11B can connect
to the existing authenticated API and content-model projection.

## What Changes

- Configure the React/Vite admin application with TanStack Router, TanStack
  Query, Tailwind, and the Radix primitives needed by Lace-owned controls.
- Introduce the responsive Lace shell, design tokens, global accessibility and
  reduced-motion defaults, and reusable owned UI primitives.
- Add typed routes for login, content, content models and entries, media,
  builds, users, and settings, including no-flash session guards and
  role-gated administrative navigation.
- Provide presentational route screens and isolated component coverage for the
  foundation only; authenticated transport, remote model navigation, lists, and
  mutations remain Session 11B work.

## Capabilities

### New Capabilities

- `admin-application-shell`: Defines the accessible client shell, design-system
  primitives, typed route topology, and session/role guard behavior for the
  Lace admin SPA.

### Modified Capabilities

- None.

## Impact

- Affects `apps/admin`, its workspace dependencies and build/test scripts.
- Uses the browser-session contract from
  `authentication-and-actor-boundary`, the default role matrix from
  `content-domain-rules`, the model-projection boundary from
  `content-model-configuration`, and the safe SPA fallback from
  `hono-app-factory`.
- Implements architecture sections 5, 6, 14, 17, 18, 19, and 20 and roadmap
  Step 11, Session 11A; it does not modify server routes, REST contracts, or
  the API composition root.
