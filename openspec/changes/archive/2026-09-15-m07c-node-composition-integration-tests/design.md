## Context

See `proposal.md` for motivation and
`specs/node-api-composition/spec.md` for the behavioral contract. The accepted
Hono factory already receives portable use cases, reads, health, operational,
and actor capabilities, but `apps/api` is only a package marker. The Node
platform already opens SQLite with the required connection pragmas, applies
forward migrations, and implements the portable content repository. There is
no configuration loader, Node HTTP listener, environment validator, or
generated OpenAPI artifact yet.

The design preserves the architecture's dependency graph: `apps/api` may depend
on `platform-node` and `server`; `platform-node` may depend on application,
server, DB, auth, and config; neither portable application nor server package
will gain Node imports. Authentication is deliberately deferred to Session 8,
so the test actor cannot become a deployable feature.

## Goals / Non-Goals

**Goals:**

- Make a real SQLite-backed Node HTTP composition available both as an
  embeddable factory and through the Node development command.
- Make startup, readiness, HTTP lifecycle tests, and generated OpenAPI
  deterministic and safe to run locally and in CI.
- Establish explicit Node-only seams that authentication, real object storage,
  caching, and build dispatch can replace in their later sessions.

**Non-Goals:**

- Loading/transpiling a user-owned `lace.config.ts` from disk. The composition
  accepts a normalized configuration; a generated-project configuration loader
  belongs with the CLI/generator work.
- Automatic migrations, configuration synchronization, Better Auth, real media
  binary serving, MinIO, external build dispatch, cache persistence, or a
  Cloudflare runtime.
- Starting unfinished Vite/Astro applications. The dev gateway accepts their
  configured already-running upstream origins and is ready to supervise them
  when those apps acquire dev commands.

## Decisions

### Node composition lives in the Node platform; the API app owns the listener and commands

`packages/platform-node` will add a Node runtime factory that accepts an
already-normalized configuration and validated Node settings, opens the SQLite
connection, creates `NodeContentRepository` and `ContentUseCases`, and passes
only portable values into `createLaceApp`. It returns the Hono application,
public URL helper/storage placeholder, readiness implementation, and a close
operation that owns the database connection. `apps/api` will expose the Node
listener/bootstrap and command-facing composition around this factory.

The app package will add the Hono Node server adapter, while platform-node
continues to own SQLite-specific construction. This follows the existing
architecture graph and keeps a future Worker composition independent. Putting
the entire listener in `platform-node` was rejected because the architecture
defines `apps/api` as the deployable composition root; putting SQLite wiring in
`server` was rejected because it would violate its runtime-neutral boundary.

### Explicit validated environment input replaces ambient reads below the entry point

The entry point will parse an injected environment map once, producing a frozen
settings object. `LACE_DATABASE_PATH` is non-empty; `LACE_PUBLIC_BASE_URL` is
parsed with `URL`, restricted to `http:`/`https:`, without credentials, query,
or fragment, and canonicalized to a single trailing-slash base. `LACE_HOST` and
`LACE_PORT` are optional operational settings, with a safe loopback/default
port policy and strict range validation. Development upstreams use optional
canonical `LACE_ADMIN_DEV_ORIGIN` and `LACE_SITE_DEV_ORIGIN`; each must be an
absolute HTTP(S) origin when configured.

Validation returns a typed aggregate of variable names and reason codes, never
interpolating supplied values. Configuration is injected into lower-level
factories rather than letting them read `process.env`, which makes redaction and
tests reliable. Permitting arbitrary URLs, `Host`-derived bases, or individual
ambient reads was rejected because it permits host-header public URL poisoning
and makes startup diagnostics unsafe.

### Local health probes use initialized state and one bounded SQL statement

The runtime marks configuration ready only after parsing has succeeded. Its
readiness probe performs a single parameter-free SQLite `SELECT 1` through the
already-open connection and turns exceptions into `false`; it neither migrates
nor synchronizes configuration. Liveness remains the Hono factory's process
probe. Object storage, build trigger, cache, and dev upstreams stay out of the
probe because they are not required to answer a cheap API-process dependency
check in this session.

### Placeholder infrastructure is explicit and non-authoritative

The Node factory will expose a no-op cache that always misses and no-op build
trigger that reports an unavailable dispatch. The storage placeholder rejects
binary operations with a sanitized unavailable error and derives any future
public read URL solely by resolving its path against the validated public base
URL. It does not read request headers. These are small private Node adapters,
not additions to portable application interfaces, so Sessions 9 and 13 can
replace them without changing transport behavior. Using an in-memory object
store in production was rejected because it would silently promise durability.

### Test actor construction is an isolated test export

The normal Node factory takes an ordinary actor resolver and production
bootstrap supplies one that always returns no actor until Session 8. A separate
test-only constructor is available only from a test-oriented export and asserts
the test runtime marker supplied by the test harness; it returns one fixed
explicit actor and does not inspect request headers, cookies, query values, or
environment. The production bootstrap neither imports nor accepts this
constructor. A request-controlled test header was rejected because it creates
an authentication bypass; using a permissive default resolver was rejected for
the same reason.

### Development gateway reserves API and health before proxy selection

The Node listener will first dispatch `/api/*`, `/health/live`, and
`/health/ready` to the Hono application. For other paths, it proxies an
`/admin` namespace to `LACE_ADMIN_DEV_ORIGIN` and all remaining site paths to
`LACE_SITE_DEV_ORIGIN`, preserving method, path/query, body, and safe response
headers. Missing configured upstreams produce a local sanitized gateway error;
connect failures produce a distinct non-secret `502` response. The command
does not spawn child processes because the admin and site packages do not yet
provide development servers. This accepts the roadmap's same-origin boundary
now without inventing placeholder browser tooling.

### OpenAPI is generated from a deterministic minimal composition

A generation script will create the Hono app with a fixed normalized fixture,
fixed environment metadata, and inert portable doubles, serialize
`/api/v1/openapi.json` with stable JSON indentation and a trailing newline, and
write `apps/api/openapi/api-v1.json`. A check script regenerates it then invokes
`git diff --exit-code` for exactly that path. CI runs the check after build; the
normal generation command is an explicit developer action. Hand-maintaining the
document was rejected because it would drift from contracts; generating it from
a live database was rejected because output must be deterministic and have no
environment dependency.

### Integration tests use a real ephemeral Node listener and SQLite file

The integration fixture creates a temporary migrated SQLite database, applies a
small normalized configuration through the existing synchronization use case,
starts the Node listener on an ephemeral loopback port, and uses native `fetch`
for all create, save, publish, public-read, and conditional-export requests.
It uses the isolated test actor for protected calls and verifies anonymous
rejection separately. The fixture closes both listener and database and removes
its temporary path in `finally`. Direct `app.fetch` tests remain unit coverage
of the portable factory; they are not a replacement for this Node integration
boundary.

## Risks / Trade-offs

- [Missing schema or unsynchronized configuration can pass `SELECT 1`] →
  migrations and configuration synchronization remain explicit operator steps;
  integration fixtures perform both, and a later operations change can add a
  richer readiness policy without making probes expensive.
- [The placeholder storage cannot serve media] → it fails closed, while Session
  9 supplies the S3/MinIO implementation and public media route.
- [The gateway does not launch frontend tools] → it documents required upstream
  origins and retains the same-origin routing contract until the frontend
  development servers exist.
- [Generated OpenAPI contains library-controlled ordering] → serialize the
  output canonically in the generator and pin library versions in the workspace
  lockfile.
- [A test-only export could be imported accidentally] → keep it outside the
  production entry point, require the harness marker, and add a production
  construction failure test.

## Migration Plan

1. Add the Node runtime factory and validated settings without changing database
   schema or migrations.
2. Add the listener, development command, temporary-database integration suite,
   and generated OpenAPI artifact/check.
3. Deploy by providing the required database path and canonical public base URL
   after running the existing explicit Node migration and configuration-sync
   workflows.
4. Roll back by restoring the prior application build; no data migration or
   background state is introduced by this change.
