# Authentication operations

## First administrator

`lace auth bootstrap` mints an expiring setup token only while installation is
incomplete. Store it in a secret manager and reveal it once to the operator
performing `POST /api/v1/setup/admin`. The endpoint accepts the token, email,
and password; after successful completion it returns `404` permanently. If a
request is interrupted, repeat it with the same token and normalized email.

For the repository's local Docker workflow, use `pnpm dev:bootstrap` after
`pnpm dev:node` becomes healthy. It runs against the configured local SQLite
database, prints the token once to its invoker, and persists only its hash. No
Compose service seeds an account or a default password. The root README has the
complete first-run request and sign-in path.

## Users and build credentials

Only administrators can create, list, disable, or change users. Lace refuses
to disable or demote the final active administrator. Build credentials are
created at the admin token endpoint, reveal their plaintext value once, and
can only read the published build export with `Authorization: Bearer <token>`.
Revoke a suspected credential immediately; listing never reveals it again.
In the browser, open `/admin/users` to manage accounts and `/admin/settings`
to inspect API readiness and configured models, create a named build token,
and revoke it later. Copy the new token before dismissing it; Settings cannot
retrieve its plaintext again. The root
[README](../README.md#show-published-content-on-the-local-site) also documents
the same-origin API request and ignored server-side environment setup.

## Request limits

Sensitive authentication, setup, token-management, and upload operations use
fixed windows. A `429` includes `Retry-After`; retry only after that duration.
Persistence records HMAC bucket identities, never raw emails or client IPs.
