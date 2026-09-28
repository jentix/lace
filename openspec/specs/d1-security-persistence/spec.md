# d1-security-persistence Specification

## Purpose
Defines how the Cloudflare runtime persists installation setup, users, build
credentials, and rate-limit buckets in D1 with the same security semantics as
Node SQLite and without an interactive transaction.

## Requirements

### Requirement: D1 security state follows the portable security contract
The Cloudflare platform SHALL provide a D1 implementation of the portable
security capability — setup-credential minting, first-admin bootstrap, user
listing, creation, role change, and disabling, and build-credential issue,
listing, revocation, and verification — that returns the same portable values
and stable error codes as the Node implementation for the same inputs. It SHALL
store only SHA-256 digests of setup and build credentials, generate 32 random
bytes encoded as base64url for each credential, compare presented credentials
without secret-dependent timing, and delegate human password hashing to the
authentication provider's hashing implementation.

#### Scenario: Same security calls give the same results
- **WHEN** the shared security contract suite runs against migrated Node SQLite
  and migrated local D1
- **THEN** every call returns equal portable values or the same failure

#### Scenario: Stored credentials are not recoverable
- **WHEN** setup-token and API-token rows are inspected after issuance
- **THEN** they contain only digests and display prefixes, never the plaintext
  credential

### Requirement: D1 security mutations are single guarded operations
Every D1 security mutation that changes more than one row SHALL execute as one
atomic `batch()` whose later statements are conditional on its guard, and every
guarded decision SHALL be evaluated inside the database statement that writes,
never from an earlier read alone. Setup-credential minting SHALL insert a token
only while setup is incomplete. Bootstrap SHALL claim a credential only when it
is unexpired, unconsumed, and unclaimed or claimed by the same email digest, and
SHALL complete setup and consume all outstanding credentials in one batch
conditional on setup still being incomplete. A disable or demotion SHALL apply
only when another active administrator remains at the moment of the write.

#### Scenario: Concurrent final-administrator changes
- **WHEN** two requests concurrently disable or demote the two remaining active
  administrators
- **THEN** at most one succeeds, the other fails with `LAST_ADMIN_PROTECTED`,
  and at least one active administrator remains

#### Scenario: Bootstrap retry resumes after interruption
- **WHEN** a claimed credential's first bootstrap stops after creating the
  administrator and a retry supplies the same credential and email
- **THEN** setup completes for that administrator without creating another user

#### Scenario: Setup completion is attempted twice
- **WHEN** setup has completed and another completion or credential minting is
  attempted
- **THEN** no credential is minted or consumed and the attempt fails

### Requirement: D1 rate-limit buckets count atomically
The D1 fixed-window rate limiter SHALL increment or reset its bucket and read the
resulting count in one atomic statement, so concurrent requests in one window
are all counted. It SHALL key buckets by an HMAC-SHA-256 of operation and
subject under the configured secret, use the same limits and windows as Node,
and return the same allowed decision and retry-after duration.

#### Scenario: Concurrent attempts share one window
- **WHEN** six setup attempts for one subject arrive concurrently in one window
- **THEN** exactly five are allowed and the sixth is refused with the remaining
  window duration

#### Scenario: Bucket keys reveal no subject
- **WHEN** a persisted bucket is inspected
- **THEN** its key is an HMAC digest and contains no raw email or client IP
