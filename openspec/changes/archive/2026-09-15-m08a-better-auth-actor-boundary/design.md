## Context

See `proposal.md` for motivation. The domain already defines a closed role and
permission matrix; content use cases require an `Actor`, while the portable
Hono server currently receives an `ActorResolver` that production Node
composition defaults to anonymous. The SQLite baseline already contains tables
with Better Auth's SQLite names and columns, including a constrained
`user.role` default, but no package configures or mounts Better Auth.

## Goals / Non-Goals

**Goals:**

- Make one Better Auth instance the Node browser-authentication authority.
- Keep the authentication package responsible for provider configuration and
  session-to-actor conversion, while keeping Hono and application packages
  free of Better Auth and SQLite imports.
- Provide explicit, validated origin/cookie/auth-secret settings to the Node
  composition root.
- Preserve portable Hono route semantics so a future Cloudflare adapter can
  supply the same auth boundary.

**Non-Goals:**

- First-admin bootstrap, administrative user management, build tokens, and
  rate limiting (Session 8B).
- Social login, email verification and recovery mail delivery, cross-origin
  deployments, or Cloudflare composition.
- Altering the established domain permission matrix or adding role checks to
  HTTP handlers.

## Decisions

### Isolate Better Auth behind `@lacecms/auth`

`@lacecms/auth` will own a factory that receives an already-created Drizzle
SQLite database, the exported DB schema, canonical origin, secret, and runtime
mode. It will configure email/password with sign-up disabled, map the existing
named Drizzle tables into the adapter, and return two framework-neutral
surfaces: a `fetch(Request)` handler for `/api/auth/*` and an
`ActorResolver`-compatible session resolver. This keeps `@lacecms/server`
dependent on a small structural interface rather than Better Auth.

Direct provider use in the Hono package was rejected because it would reverse
the portable-server dependency direction. A raw SQLite provider adapter was
rejected because it would create an independent connection/transaction model
instead of using the existing Drizzle schema and Node connection.

### Validate configuration once at Node composition

Node runtime settings will gain an auth secret and production-mode inputs; the
already-validated canonical public base URL supplies Better Auth's base URL and
sole trusted origin. Empty or malformed secrets fail startup with only a key
name in diagnostics. The provider will retain its built-in CSRF and origin
checks, use a same-origin `SameSite=Lax` cookie policy, and set `Secure` when
production mode is enabled.

Trusting request headers or allowing configurable arbitrary trusted origins was
rejected because the architecture explicitly keeps authenticated admin and API
traffic on one origin.

### Route precedence and lazy actor resolution

The Hono app will mount the supplied auth handler at `/api/auth/*` before API
fallback behavior. Existing protected handlers retain a lazily invoked actor
helper; only that helper calls the supplied resolver, caches its successful
result on context, and returns the existing sanitized authorization response on
failure. Public and health routes never invoke it. Use cases continue to call
`requirePermission`, so neither auth middleware nor handlers encode a role
matrix.

Global session middleware was rejected because it would needlessly parse
cookies on public and probe endpoints and blur the protected-route boundary.

### Treat current migration as compatibility baseline

Tests will exercise the provider against a freshly migrated SQLite database.
If Better Auth 1.7.3 requires schema changes, add a new numbered Drizzle
migration and snapshot; otherwise retain the baseline tables and document the
compatibility verification. In either case, migrations remain ordered and
forward-only. No migration may recreate existing provider tables.

## Risks / Trade-offs

- [Better Auth's schema expectation differs from the baseline] → Verify it
  with sign-in/session integration tests before treating the existing migration
  as sufficient; add only the minimal forward migration if needed.
- [A provider handler consumes an unexpected `/api/*` path] → Mount the handler
  only at `/api/auth/*` and test unknown API routes still reach the sanitized
  API failure.
- [A future cross-origin admin requires different cookies] → Keep same-origin
  as the explicit MVP constraint; specify a future security-reviewed change.
- [Session data is malformed or role data is corrupted] → Fail closed during
  actor mapping and avoid logging raw session or cookie material.

## Migration Plan

1. Add Better Auth to the workspace catalog and auth package, then build its
   Drizzle-backed factory against the current DB schema.
2. Add a forward DB migration only if the compatibility test proves the
   baseline schema is incomplete; migrate fresh and existing fixtures.
3. Extend Node configuration and composition to construct auth at startup.
4. Extend portable server input with the narrow auth handler, mount it before
   fallbacks, and keep existing actor resolution lazy on protected routes.
5. Verify focused auth/server/API tests, regenerate OpenAPI only if the
   versioned contract changes, then run repository quality checks.

Rollback is a normal application rollback when no migration is required. If a
forward migration is added, deployment rollback keeps the additive schema in
place while reverting code; migrations are never reversed in place.
