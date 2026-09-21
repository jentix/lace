## 1. Contract and client foundations

- [x] 1.1 Define and export strict runtime DTO schemas for the complete portable MVP field-metadata union and field map, update the content-model DTO converter and server mapping, and verify contract tests accept every valid descriptor and reject malformed or unknown metadata.
- [x] 1.2 Add the React Hook Form dependency and browser-safe metadata validation/compiler utilities that reuse the portable content rules, and verify focused unit tests cover all descriptor variants, defaults, requiredness, bounds, select choices, and safe URL/rich-text errors.
- [x] 1.3 Extend the credentialed admin client with validated entry loading and complete-draft saving (including the expected revision), retain documented field-level validation issues in its sanitized error type, and verify request/response/error behavior in admin-client tests.

## 2. Metadata-driven entry editor

- [x] 2.1 Replace the protected entry placeholder with model-and-entry loading that validates route/model identity and renders safe loading, not-found, and error states; verify component tests cover each state without an editable form for invalid metadata.
- [x] 2.2 Implement the metadata-keyed field-renderer registry and React Hook Form draft aggregate for title, collection slug, and every MVP model field type, with labels, descriptions, and accessible local errors; verify component tests cover rendering and prevented invalid submission for each variant.
- [x] 2.3 Implement opt-in deterministic title-to-slug suggestion state that stops after a manual slug edit and is absent for pages, and verify component tests cover opt-in, manual override, re-enable, and page behavior.
- [x] 2.4 Implement explicit complete-draft save status and response-only form reset, preserving the ordered block list without block editing, and verify a component test observes one PUT with the expected revision and the returned revision as the new clean baseline.

## 3. Unsaved-change safety and regression verification

- [x] 3.1 Add dirty-state navigation guards for in-app route transitions and browser unload, with an accessible leave-or-stay confirmation and no implicit autosave, and verify component tests retain edits on stay, allow pristine navigation, and issue no save before Save.
- [x] 3.2 Preserve failed-save values and map validated server JSON Pointer issues to their controls without exposing internals, and verify component tests cover server field validation and a generic sanitized failure state.
- [x] 3.3 Run the focused admin and contracts tests, then root typecheck, Oxlint, Oxfmt check, and strict OpenSpec validation; record all passing commands in the implementation result.
