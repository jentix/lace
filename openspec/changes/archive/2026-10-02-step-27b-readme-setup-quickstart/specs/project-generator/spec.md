## ADDED Requirements

### Requirement: Root README is user-owned and existing introductions are preserved

Fresh generated projects SHALL contain a root `README.md` classified as user-owned without a digest in the ownership manifest. When an allowed target already contains a regular `README.md`, generation SHALL preserve its exact bytes and classify that path as user-owned, without replacing or appending text. Successful CLI output SHALL direct fresh consumers to README and identify `docs/lace-operations.md`; when preserving a README, output SHALL explicitly identify the preserved file, the operations fallback and manual incorporation of Lace instructions. A project generated in a `cms/` directory SHALL place these files inside that installation root. The same rules SHALL apply with and without `--cloudflare`, retaining existing staged-publication and failure-recovery guarantees.

#### Scenario: Fresh root quickstart
- **WHEN** a consumer generates a fresh project in `cms/`
- **THEN** `cms/README.md` contains Lace setup instructions, its manifest entry has user ownership without a digest, and CLI output points to README and the operations guide

#### Scenario: Existing README including arbitrary bytes
- **WHEN** `init .` succeeds in an allowed target containing a regular README
- **THEN** every original README byte remains unchanged, its manifest entry is user-owned, and CLI output directs the consumer to the operations guide and manual incorporation

#### Scenario: Failure while preserving an introduction
- **WHEN** staged generation or publication fails in an allowed target with README
- **THEN** the original README and other allowed entries remain unchanged or existing recovery diagnostics identify the original backup, and the command does not claim successful setup

#### Scenario: Cloudflare ownership parity
- **WHEN** a project is generated with `--cloudflare` and an allowed existing README
- **THEN** the README preservation, ownership and fallback match the default variant
