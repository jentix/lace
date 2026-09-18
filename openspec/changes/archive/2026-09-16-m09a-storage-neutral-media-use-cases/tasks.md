## 1. Portable media contracts and validation

- [x] 1.1 Define metadata-create/list/get/retry lifecycle ports, portable image-inspection and operational-log boundaries, opaque-key inputs, and deterministic in-memory doubles; verify focused application contract tests compile without Node or HTTP types.
- [x] 1.2 Implement bounded byte-stream collection, filename sanitization, opaque key generation, and binary verification for JPEG, PNG, WebP, and AVIF; verify unit fixtures reject empty, SVG, MIME-spoofed, truncated, polyglot, unsupported, and over-10-MiB inputs.
- [x] 1.3 Enforce image metadata limits of 12,000 pixels per side and 100,000,000 pixels total through the portable inspector boundary; verify table-driven tests cover valid boundary values and each exceeded limit.

## 2. Media lifecycle use cases

- [x] 2.1 Implement authorized create, list, get, delete-request, and retry-delete media use cases with detached portable outputs; require `media:write` for mutations and `content:read` for reads, and verify editor/viewer authorization and lifecycle tests cover every operation.
- [x] 2.2 Orchestrate upload as validation, opaque identity/key allocation, object write, then active metadata creation; on metadata failure, attempt best-effort object cleanup and emit a sanitized operational record; verify ordering, cleanup-success, cleanup-failure, and no-binary-metadata cases with deterministic doubles.

## 3. Complete-draft media projection

- [x] 3.1 Refactor complete-draft media validation to derive a fresh, exhaustive projection from normalized model and block fields and pass it to atomic create/save commands; verify add/remove/replace media fields leave no stale projection entries and inactive/missing IDs fail before mutation.
- [x] 3.2 Run focused application/domain tests, then `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm exec openspec validate m09a-storage-neutral-media-use-cases --type change --strict`; resolve all failures before marking this task complete.
