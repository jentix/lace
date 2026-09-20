## Why

Session 12A/12B let writers safely edit an isolated complete draft, but the
editor does not yet make publication, revision conflicts, or the public/build
boundary understandable. Session 12C completes the roadmap's draft-editor
experience without introducing automatic merging or build-history management.

## What Changes

- Implement Step 12, Session 12C — Publication and conflict UX — in the
  browser admin editor.
- Present draft revision and editor timestamp/identity, publication state,
  resolved public path, and the immediately returned build-dispatch state.
- Preserve local form values after a revision conflict and provide explicit
  reload-server-draft and copy-local-JSON recovery actions.
- Add admin-only, confirmed publication with one browser-generated idempotency
  key retained for retries of the same publish attempt.
- Return the already-computed publication/build-dispatch outcome through the
  validated publish transport so the UI can distinguish publication success
  from a pending, rejected, unavailable, or not-dispatched build.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-draft-editor`: define publication status, explicit conflict recovery,
  admin-only confirmed publishing, retry-safe idempotency behavior, and public
  snapshot isolation in the browser editor.
- `rest-contracts`: define a validated publish-result representation that
  carries the entry plus the portable publication and build-dispatch outcomes.

## Impact

- Affects `apps/admin` editor components, client queries/mutations, styles,
  component tests, and Playwright coverage.
- Affects `packages/contracts` and `packages/server` publish response mapping;
  it reuses the existing application use case's separate publication/build
  result rather than adding persistence or a build-history API.
- Depends on architecture sections 4.4, 4.7, 11, 12, and 18; the accepted
  `admin-draft-editor`, `rest-contracts`, and `content-use-cases` behavior; and
  Sessions 12A/12B. Build tracking, history, retry controls, and VPS builder
  work remain Step 13 non-goals.
