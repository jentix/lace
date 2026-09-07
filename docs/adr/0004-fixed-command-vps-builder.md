# ADR 0004: Use a private fixed-command VPS builder

- Status: Accepted
- Date: 2026-09-07
- Governing architecture: [section 5](../mvp-architecture.md#5-system-context) and [section 13](../mvp-architecture.md#13-site-builds-and-static-deployment)

## Context

VPS deployment must rebuild the Astro site after publication without converting
an HTTP request into arbitrary command execution. Publication must remain durable
when the builder is offline or fails.

## Decision

The first-party `apps/builder` service is private and accepts an authenticated
trigger containing only build ID and target published-state version. It rejects
caller-supplied command, path, and environment overrides. Its image defines the
single build command and fixed read-only source/output mount paths. It installs
with an image-pinned toolchain and frozen lockfile, builds a temporary release,
and atomically switches the served release only on success.

The API dispatches through the outbox and `SiteBuildTrigger`; builder failure
leaves a recoverable pending or failed build state without undoing publication.

## Consequences

- Authenticated callers cannot use the builder as a shell or filesystem oracle.
- Publication and build success are distinct observable states.
- Deployment needs an API-to-builder secret and topology with no public builder
  port.

## Alternatives considered

- Arbitrary commands, paths, or environment values were rejected as a remote
  command-execution and data-exfiltration boundary.
- Synchronous builds in the API were rejected because build latency and failure
  would make publication unavailable.
- CI-only webhooks were rejected because the MVP needs a self-hosted first-party
  VPS path; later adapters may use CI through the same trigger port.
