## Context

See proposal.md. `packages/auth` derives Better Auth's single trusted origin from `LACE_PUBLIC_BASE_URL`. The generated local environment sets `127.0.0.1`, while browsers may enter through `localhost`. The request's browser Origin is then rejected before credential verification.

## Goals / Non-Goals

**Goals:** Let both local loopback names sign in on the configured scheme and port, while keeping origin and CSRF checks enabled.

**Non-Goals:** Trusting other hostnames, ports, schemes, or changing cookie security in production.

## Decisions

- Compute the trusted-origin list in `packages/auth` from the canonical origin. Add the one alternate loopback hostname only when `production` is false and the canonical hostname is exactly `localhost` or `127.0.0.1`; preserve the scheme and port. Better Auth continues to enforce this explicit list.
- Keep the local URL generation and canonical public base URL unchanged. Redirecting the browser to the canonical hostname was considered, but would disrupt a user-entered URL and host-scoped session cookie.
- Test real sign-in with the alternate local hostname and assert that a foreign origin and production alias still fail. Use synthetic test credentials only.

## Risks / Trade-offs

- [Two local names create separate host-scoped browser sessions] → Document that a session opened on one hostname may require signing in again on the other; neither cookie crosses to an unrelated host.
- [A wider trusted-origin set could weaken production] → Apply the alias only to exact loopback hostnames in non-production and keep the negative tests.

## Migration Plan

No migration. Restart the local API process or development stack to load the new authentication configuration.
