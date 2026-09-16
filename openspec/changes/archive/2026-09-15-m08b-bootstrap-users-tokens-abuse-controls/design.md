## Context

See proposal.md for motivation. The baseline schema already has installation,
setup-token, API-token, and rate-limit tables, and Session 8A has a Node-only
Better Auth boundary that maps sessions to the closed Lace role set. The
portable server currently has a boolean rate limiter and only content routes;
the application package has token hashing but no security lifecycle commands.
Architecture section 14 fixes the first-admin protocol, opaque-token format,
and fixed-window defaults.

## Goals / Non-Goals

**Goals:**

- Define portable command/read ports and application use cases for every 8B
  lifecycle, with Node SQLite implementations that can later be matched by D1.
- Keep Better Auth responsible for password hashes and provider sessions while
  placing setup state, role changes, disabled-state checks, and build tokens in
  Lace-owned persistence.
- Make each race-sensitive operation a short guarded database transaction and
  retain secret-safe observability.

**Non-Goals:**

- Adding the media upload endpoint; its predeclared rate-limit operation is
  only configured through the shared limiter boundary.
- Extending browser authentication beyond the Session 8A same-origin policy,
  user invitations, password recovery, email verification, or Cloudflare
  composition.

## Decisions

### Claim setup before provider user creation

The setup repository will atomically read installation state, validate expiry,
and bind a setup-token verifier to the SHA-256 email digest. Better Auth user
creation stays outside that transaction, then a second guarded completion
transaction records the created admin and consumes all tokens. A same-email
retry finds the existing claim and resumes; a different digest fails. This
preserves the architecture's retry protocol without assuming a provider call
can participate in a portable D1 transaction. A single transaction spanning
provider creation was rejected because it would couple the protocol to one
database adapter.

### Separate human session and build-token authenticators

The auth package will expose narrow account creation/session validation
operations needed by setup and administration, while the application layer
defines a build-token verifier port and a build-export authorization result.
Build tokens use 32 random bytes in base64url; the implementation stores
SHA-256 verifiers, performs fixed-length constant-time equality, and only
returns secret text from the create command. Reusing Better Auth sessions or
creating a general bearer-token scheme was rejected because build access must
not acquire admin capabilities.

### Enforce last-admin protection in persistent guarded mutations

Disable and role-change commands will use a transaction that checks the target
state and active-admin count immediately before the mutation; a partial index
or equivalent bounded query will support the count. The Node implementation
will use an immediate SQLite transaction; the portable port describes the
outcome so D1 can use a conditional batch. An application-memory count was
rejected because independent processes could both remove the final admin.

### Make limiter classification explicit at the HTTP boundary

The server will accept a limiter that returns an allow/deny decision plus the
remaining current-window duration, and classify requests by operation before
the corresponding route runs. The runtime hashes `operation + subject` with a
validated deployment secret and performs a bounded SQLite upsert/update in the
same fixed window. Generic global request limiting was rejected because the
architecture mandates different sensitive-operation subjects and ceilings.

## Risks / Trade-offs

- [A provider creation succeeds but client loses the response] → the retained
  email-bound claim and completion query make the retry safe.
- [An attacker submits varied email spellings] → normalize email consistently
  before hashing and provider creation, and rate-limit the normalized subject.
- [Token verification leaks through lookup timing] → use fixed-length
  verifiers, constant-time comparison, and indistinguishable authorization
  failures.
- [New security routes drift from generated docs] → extend shared contracts
  and regenerate/check OpenAPI in the same task.

## Migration Plan

1. Add application/security contracts and deterministic tests, then add any
   required additive schema indexes or fields through an ordered migration.
2. Implement the Node SQLite repositories and cryptographic adapters, including
   migration and concurrency tests against a fresh database.
3. Extend the auth boundary, contracts, portable server routes, and Node
   composition; test setup retries, user matrix, tokens, limits, cookies, and
   origin behavior through HTTP.
4. Deploy schema before code. A code rollback leaves additive state and indexes
   intact; setup claims/tokens are never decoded or converted back to plaintext.
