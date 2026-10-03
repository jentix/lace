## 1. Observation harness

- [x] 1.1 Add the `publication-visibility` consumer acceptance phase (generated dev, independent existing-site dev, manual static build, Compose automatic release, draft-only save, new route, dev restart) with observe-only mode, and record the 0.7.0 baseline; verify the baseline run prints observations for every mode and the agent-backgrounded Astro dev is controlled.

## 2. Generated site and proxy

- [x] 2.1 Implement ETag dev revalidation in the generated `site/src/lib/site-data.ts` (static builds keep one memoized export and expected-version checks) and slug-based lookup in `site/src/pages/blog/[slug].astro`; verify with a focused generator test covering conditional reuse, changed exports, error propagation and single build request, plus generated typecheck/build in acceptance.
- [x] 2.2 Add `Cache-Control: no-cache` to the generated proxy site locations, advance the template to `0.8.0` with upgrade instructions, and update generator/upgrade tests and default/Cloudflare snapshots; verify `create-lace` and CLI upgrade suites and the snapshot phase.

## 3. Admin guidance

- [x] 3.1 Track the persisted covering build and current site label in entry publication details with shared mode copy; verify EntryPublicationDetails/EntryPage tests for waiting, pending, succeeded (refresh stops), failed (previous release + Builds link), history error fallback and no-build cases.
- [x] 3.2 Add the Builds visibility section and reconcile tour publication/Builds copy; verify Builds tests for all roles and tour tests/assertions containing the verified modes without per-publication restart guidance.

## 4. Documentation

- [x] 4.1 Replace restart-after-publication guidance in the generated README and operations guide with per-mode visibility, existing-site dev behavior, Compose pending/success window and cache headers; verify by text review against acceptance observations and generator snapshot.

## 5. Verification and completion

- [x] 5.1 Run the `publication-visibility` acceptance phase with expectations enabled against freshly built images and packed packages; verify it passes, then record observations, artifact identities and limits in `docs/archive/step-29/step-29b-verification.md` and update the roadmap and onboarding feedback §12.
- [x] 5.2 Run focused suites, root `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm exec openspec validate publication-visibility-guidance --type change --strict`; verify all pass before marking the change complete.
