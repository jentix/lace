## Context

`apps/admin` currently exports only a package identifier. The server already
handles Better Auth under `/api/auth/*` and has a safe static-admin fallback
outside API and health namespaces, while the accepted role matrix is owned by
the domain boundary. This Session 11A change introduces a browser bundle but
does not change those server, contract, or authorization boundaries. See
`proposal.md` and `specs/admin-application-shell/spec.md` for motivation and
observable requirements.

## Goals / Non-Goals

**Goals:**

- Establish an independently buildable Vite/React SPA whose route modules can
  grow through the next admin sessions.
- Keep browser session resolution, route policy, and presentation separate so
  route checks are testable without an API server.
- Make the first UI components accessible and responsive by default rather than
  layering remediation over the editor later.

**Non-Goals:**

- A shared-schema credentialed REST client, sign-in/sign-out forms, remote
  model navigation, collection lists, or mutations; these are Session 11B.
- Changes to the Hono fallback, authentication provider, HTTP API, or role
  policy.
- Storybook unless its setup is demonstrably smaller than the isolated Vitest
  component and route coverage required for this session.

## Decisions

### Use a conventional Vite SPA entry and a feature-oriented admin source tree

`apps/admin` will gain a Vite HTML entry, browser entry module, global token
stylesheet, route tree, shell, session boundary, and owned UI component
modules. The workspace package remains browser-only and imports only React,
TanStack libraries, Radix primitives, and portable Lace dependencies.

Keeping the Vite app inside the existing `apps/admin` package preserves the
architecture's package direction and lets the API composition remain responsible
for serving the built output. A separate admin runtime package was rejected:
it would add a boundary without serving a second consumer.

### Centralize the session adapter in router context

The router receives a small `AdminSessionSource` that returns either a
validated `admin`, `editor`, or `viewer` session descriptor or no session. The
browser implementation performs a same-origin, credential-including session
read; test and preview implementations can supply deterministic results.

Protected route `beforeLoad` checks await this source. The root route exposes
only a neutral pending shell until resolution has succeeded, while the login
route reverses the condition for authenticated sessions. This prevents a
protected-page flash and avoids scattering session reads across page modules.
Using a general global state store was rejected because TanStack Router already
owns route lifecycle and this session state is solely a route prerequisite.

### Make navigation policy declarative and role-based

One navigation registry supplies label, path, icon, and allowed-role metadata
to the shell. The route tree uses the same policy for direct `/users` and
`/settings` visits, producing an accessible access-denied state for non-admins.
The application will continue to rely on the server for actual authorization;
route policy only avoids misleading affordances and protected-content flashes.

Redirecting a signed-in non-admin to another route was rejected because it
conceals why a bookmarked address cannot be viewed. Rendering the page then
hiding individual controls was rejected because it would leak protected
information and is harder to verify.

### Use CSS custom properties as the token contract and wrap behavior primitives

The global stylesheet defines semantic custom properties for color, typography,
spacing, radius, focus, and motion, which Tailwind utility values consume.
Lace-owned controls compose those tokens; Dialog, Select, and Toast wrap Radix
behavior primitives rather than exposing unthemed library components. Native
HTML is used where it already provides the needed semantic behavior.

Tailwind's Vite integration is selected for a compact browser build setup.
Adopting a full component theme was rejected because architecture section 19
requires Lace to own the visual system. CSS animation is guarded with
`prefers-reduced-motion`, and the shell uses an off-canvas navigation control at
narrow widths instead of a permanently collapsed inaccessible sidebar.

### Keep verification browser-free for this foundation

Vitest tests exercise route guard and policy behavior through the injected
session source and render the owned controls with a DOM test environment. A
lightweight isolated preview route or test fixture demonstrates component
states; Storybook is intentionally deferred because it is optional in the
roadmap and would not improve the vertical slice enough to justify its setup.

## Risks / Trade-offs

- [Better Auth session response is provider-owned] → Parse only the role and
  stable identity information required by navigation, fail closed on malformed
  data, and isolate the read behind `AdminSessionSource` for later replacement.
- [Route APIs and generated types can increase setup complexity] → Keep routes
  colocated and include typecheck coverage for every required path and route
  parameter grammar.
- [CSS tokens may become too broad before content forms exist] → Define only
  the semantic values needed by the initial shell and owned controls; expand
  tokens through later component work.
- [Client-side guards cannot authorize data] → Do not call protected resource
  endpoints in Session 11A, and retain server-side authorization as the source
  of truth.

## Migration Plan

1. Add pinned workspace catalog entries and admin-package dependencies, then
   introduce the Vite build and development scripts.
2. Add the app entry, token stylesheet, owned controls, shell, session adapter,
   and typed route tree with focused tests.
3. Build the admin output and exercise it through the existing composition
   fallback in a focused integration check where available.
4. Roll back by reverting this self-contained app-package and dependency change;
   no database, server-route, or persisted-content migration is involved.
