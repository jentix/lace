import type { NormalizedContentModel } from "@lacecms/config";
import { validateModelFields } from "@lacecms/content";
import type { JsonObject } from "@lacecms/content";
import {
  DomainError,
  actorId,
  contentEntryId,
  contentModelKey,
  contentSnapshotId,
  createContentEntry,
} from "@lacecms/domain";
import type {
  Actor,
  ContentEntry,
  ContentEntryId,
  ContentModelKey,
  ContentModelRoute,
  ContentSnapshotId,
  UnixMilliseconds,
} from "@lacecms/domain";
import type { Clock, IdGenerator } from "./index.js";

export interface StoredContentModelState {
  readonly draftSnapshotCount: number;
  readonly entryCount: number;
  readonly key: ContentModelKey;
  readonly kind: ContentModelRoute["kind"];
  readonly projectionHash: string;
  readonly publishedSnapshotCount: number;
  readonly structureHash: string;
  readonly version: number;
}

export interface ConfigurationSyncPlanInput {
  readonly models: readonly NormalizedContentModel[];
  readonly storedModels: readonly StoredContentModelState[];
}

export interface ConfigurationSyncModel {
  readonly key: ContentModelKey;
  readonly kind: ContentModelRoute["kind"];
  readonly projectionHash: string;
  readonly structureHash: string;
  readonly version: number;
}

interface ConfigurationSyncModelOperation {
  readonly model: ConfigurationSyncModel;
}

export type ConfigurationSyncOperation =
  | (ConfigurationSyncModelOperation & { readonly action: "create" })
  | (ConfigurationSyncModelOperation & { readonly action: "label-update" })
  | (ConfigurationSyncModelOperation & { readonly action: "version-update" })
  | (ConfigurationSyncModelOperation & { readonly action: "remove" })
  | (ConfigurationSyncModelOperation & {
      readonly action: "rename";
      readonly renamedFrom: ContentModelKey;
    })
  | (ConfigurationSyncModelOperation & {
      readonly action: "blocked-removal";
      readonly stored: StoredContentModelState;
    })
  | (ConfigurationSyncModelOperation & {
      readonly action: "incompatible-change";
      readonly stored: StoredContentModelState;
    });

export type ConfigurationSyncDiagnosticCode =
  | "DUPLICATE_CURRENT_MODEL"
  | "DUPLICATE_STORED_MODEL"
  | "MODEL_KIND_CHANGED"
  | "RENAME_KIND_CHANGED"
  | "RENAME_SOURCE_MISSING"
  | "RENAME_SOURCE_STILL_CONFIGURED"
  | "REMOVAL_HAS_ENTRIES"
  | "STRUCTURE_CHANGE_HAS_SNAPSHOTS"
  | "STRUCTURE_CHANGE_NEEDS_VERSION_BUMP"
  | "VERSION_REGRESSION";

export interface ConfigurationSyncDiagnostic {
  readonly code: ConfigurationSyncDiagnosticCode;
  readonly message: string;
  readonly modelKey: ContentModelKey;
  readonly relatedModelKey?: ContentModelKey;
}

export interface ConfigurationSyncPlan {
  readonly diagnostics: readonly ConfigurationSyncDiagnostic[];
  readonly isValid: boolean;
  readonly operations: readonly ConfigurationSyncOperation[];
  readonly requiresApply: boolean;
}

export interface ConfigurationSyncCheckResult {
  readonly exitCode: 0 | 1;
  readonly plan: ConfigurationSyncPlan;
}

export interface ConfigurationSyncReport {
  readonly check: ConfigurationSyncCheckResult;
  readonly json: string;
  readonly text: string;
}

/** Read-only persistence boundary used by dry-run and guarded apply coordination. */
export interface ConfigurationSyncStateReadPort {
  readConfigurationSyncState(): Promise<readonly StoredContentModelState[]>;
}

/** One pre-materialized singleton draft required by a page-model create operation. */
export interface ConfigurationSyncPageEntry {
  readonly entry: ContentEntry;
  readonly modelKey: ContentModelKey;
}

/** Complete guarded input for one atomic synchronization mutation. */
export interface ApplyConfigurationSynchronizationInput {
  readonly appliedAt: UnixMilliseconds;
  readonly expectedStoredModels: readonly StoredContentModelState[];
  readonly models: readonly NormalizedContentModel[];
  readonly pageEntries: readonly ConfigurationSyncPageEntry[];
  readonly plan: ConfigurationSyncPlan;
}

/** Portable result that distinguishes a committed apply from an unchanged no-op. */
export interface ApplyConfigurationSynchronizationResult {
  readonly operations: readonly ConfigurationSyncOperation[];
  readonly status: "applied" | "noop";
  readonly targetVersion?: number;
}

/** Specialized mutation boundary; it intentionally does not expose a transaction callback. */
export interface ConfigurationSyncApplyPort {
  applyConfigurationSynchronization(
    input: ApplyConfigurationSynchronizationInput,
  ): Promise<ApplyConfigurationSynchronizationResult>;
}

/** A dry-run result that preserves the exact persisted snapshot later guarded by apply. */
export interface PreparedConfigurationSynchronization {
  readonly plan: ConfigurationSyncPlan;
  readonly report: ConfigurationSyncReport;
  readonly storedModels: readonly StoredContentModelState[];
}

export const contentSyncActor: Actor = Object.freeze({
  id: actorId("system:content-sync"),
  role: "admin",
});

function copyModel(model: NormalizedContentModel): ConfigurationSyncModel {
  return Object.freeze({
    key: contentModelKey(model.key),
    kind: model.kind,
    projectionHash: model.projectionHash,
    structureHash: model.structureHash,
    version: model.version,
  });
}

function copyStoredModel(model: StoredContentModelState): StoredContentModelState {
  return Object.freeze({
    draftSnapshotCount: model.draftSnapshotCount,
    entryCount: model.entryCount,
    key: contentModelKey(model.key),
    kind: model.kind,
    projectionHash: model.projectionHash,
    publishedSnapshotCount: model.publishedSnapshotCount,
    structureHash: model.structureHash,
    version: model.version,
  });
}

function diagnostic(
  code: ConfigurationSyncDiagnosticCode,
  modelKey: string,
  message: string,
  relatedModelKey?: string,
): ConfigurationSyncDiagnostic {
  return Object.freeze({
    code,
    message,
    modelKey: contentModelKey(modelKey),
    ...(relatedModelKey === undefined ? {} : { relatedModelKey: contentModelKey(relatedModelKey) }),
  });
}

function compareByKey<Value extends { readonly key: string }>(left: Value, right: Value): number {
  return left.key.localeCompare(right.key);
}

function compareDiagnostics(
  left: ConfigurationSyncDiagnostic,
  right: ConfigurationSyncDiagnostic,
): number {
  return (
    left.modelKey.localeCompare(right.modelKey) ||
    left.code.localeCompare(right.code) ||
    (left.relatedModelKey ?? "").localeCompare(right.relatedModelKey ?? "")
  );
}

function hasSnapshots(model: StoredContentModelState): boolean {
  return model.draftSnapshotCount > 0 || model.publishedSnapshotCount > 0;
}

function snapshotDescription(model: StoredContentModelState): string {
  const states: string[] = [];
  if (model.draftSnapshotCount > 0) states.push(`draft=${model.draftSnapshotCount}`);
  if (model.publishedSnapshotCount > 0) states.push(`published=${model.publishedSnapshotCount}`);
  return states.join(", ");
}

function incompatible(
  model: ConfigurationSyncModel,
  stored: StoredContentModelState,
): ConfigurationSyncOperation {
  return Object.freeze({ action: "incompatible-change", model, stored });
}

function classifyMatchedModel(
  model: ConfigurationSyncModel,
  stored: StoredContentModelState,
  diagnostics: ConfigurationSyncDiagnostic[],
): ConfigurationSyncOperation | undefined {
  if (model.kind !== stored.kind) {
    diagnostics.push(
      diagnostic(
        "MODEL_KIND_CHANGED",
        model.key,
        `Model ${model.key} changes kind from ${stored.kind} to ${model.kind}.`,
      ),
    );
    return incompatible(model, stored);
  }
  if (model.version < stored.version) {
    diagnostics.push(
      diagnostic(
        "VERSION_REGRESSION",
        model.key,
        `Model ${model.key} regresses version from ${stored.version} to ${model.version}.`,
      ),
    );
    return incompatible(model, stored);
  }

  const structureChanged = model.structureHash !== stored.structureHash;
  if (structureChanged && model.version === stored.version) {
    diagnostics.push(
      diagnostic(
        "STRUCTURE_CHANGE_NEEDS_VERSION_BUMP",
        model.key,
        `Model ${model.key} changes structure without increasing version ${model.version}.`,
      ),
    );
    return incompatible(model, stored);
  }
  if (structureChanged && hasSnapshots(stored)) {
    diagnostics.push(
      diagnostic(
        "STRUCTURE_CHANGE_HAS_SNAPSHOTS",
        model.key,
        `Model ${model.key} changes structure while snapshots exist (${snapshotDescription(stored)}).`,
      ),
    );
    return incompatible(model, stored);
  }
  if (structureChanged || model.version > stored.version) {
    return Object.freeze({ action: "version-update", model });
  }
  if (model.projectionHash !== stored.projectionHash) {
    return Object.freeze({ action: "label-update", model });
  }
  return undefined;
}

function modelForStoredState(stored: StoredContentModelState): ConfigurationSyncModel {
  return Object.freeze({
    key: stored.key,
    kind: stored.kind,
    projectionHash: stored.projectionHash,
    structureHash: stored.structureHash,
    version: stored.version,
  });
}

function operationKey(operation: ConfigurationSyncOperation): string {
  return operation.model.key;
}

/** Plans configuration identity reconciliation without reading or mutating a runtime adapter. */
export function planConfigurationSynchronization(
  input: ConfigurationSyncPlanInput,
): ConfigurationSyncPlan {
  const diagnostics: ConfigurationSyncDiagnostic[] = [];
  const operations: ConfigurationSyncOperation[] = [];
  const currentModels = [...input.models].sort(compareByKey);
  const storedModels = [...input.storedModels].map(copyStoredModel).sort(compareByKey);
  const currentKeys = new Set<string>();
  const duplicateCurrentKeys = new Set<string>();
  const storedByKey = new Map<string, StoredContentModelState>();
  const duplicateStoredKeys = new Set<string>();

  for (const model of currentModels) {
    if (currentKeys.has(model.key)) {
      duplicateCurrentKeys.add(model.key);
      diagnostics.push(
        diagnostic("DUPLICATE_CURRENT_MODEL", model.key, `Model ${model.key} is configured twice.`),
      );
    }
    currentKeys.add(model.key);
  }
  for (const stored of storedModels) {
    if (storedByKey.has(stored.key)) {
      duplicateStoredKeys.add(stored.key);
      diagnostics.push(
        diagnostic(
          "DUPLICATE_STORED_MODEL",
          stored.key,
          `Stored model ${stored.key} appears twice.`,
        ),
      );
      continue;
    }
    storedByKey.set(stored.key, stored);
  }

  const consumedStoredKeys = new Set<string>();
  for (const current of currentModels) {
    if (duplicateCurrentKeys.has(current.key)) continue;
    const model = copyModel(current);
    const stored = storedByKey.get(model.key);
    if (stored !== undefined && !duplicateStoredKeys.has(model.key)) {
      consumedStoredKeys.add(stored.key);
      const operation = classifyMatchedModel(model, stored, diagnostics);
      if (operation !== undefined) operations.push(operation);
      continue;
    }

    if (current.renamedFrom === undefined) {
      operations.push(Object.freeze({ action: "create", model }));
      continue;
    }

    const former = storedByKey.get(current.renamedFrom);
    if (former === undefined || duplicateStoredKeys.has(current.renamedFrom)) {
      diagnostics.push(
        diagnostic(
          "RENAME_SOURCE_MISSING",
          model.key,
          `Model ${model.key} names missing former model ${current.renamedFrom}.`,
          current.renamedFrom,
        ),
      );
      continue;
    }
    consumedStoredKeys.add(former.key);
    if (currentKeys.has(former.key)) {
      diagnostics.push(
        diagnostic(
          "RENAME_SOURCE_STILL_CONFIGURED",
          model.key,
          `Model ${model.key} names still-configured model ${former.key} as renamedFrom.`,
          former.key,
        ),
      );
      operations.push(incompatible(model, former));
      continue;
    }
    if (model.kind !== former.kind) {
      diagnostics.push(
        diagnostic(
          "RENAME_KIND_CHANGED",
          model.key,
          `Model ${model.key} changes renamed model ${former.key} from ${former.kind} to ${model.kind}.`,
          former.key,
        ),
      );
      operations.push(incompatible(model, former));
      continue;
    }
    const transition = classifyMatchedModel(model, former, diagnostics);
    if (transition?.action === "incompatible-change") {
      operations.push(transition);
      continue;
    }
    operations.push(Object.freeze({ action: "rename", model, renamedFrom: former.key }));
  }

  for (const stored of storedModels) {
    if (consumedStoredKeys.has(stored.key) || duplicateStoredKeys.has(stored.key)) continue;
    const model = modelForStoredState(stored);
    if (stored.entryCount === 0) {
      operations.push(Object.freeze({ action: "remove", model }));
      continue;
    }
    diagnostics.push(
      diagnostic(
        "REMOVAL_HAS_ENTRIES",
        stored.key,
        `Model ${stored.key} cannot be removed while it has ${stored.entryCount} entries.`,
      ),
    );
    operations.push(Object.freeze({ action: "blocked-removal", model, stored }));
  }

  operations.sort((left, right) => operationKey(left).localeCompare(operationKey(right)));
  diagnostics.sort(compareDiagnostics);
  const frozenOperations = Object.freeze(operations.map((operation) => Object.freeze(operation)));
  const frozenDiagnostics = Object.freeze(diagnostics.map((value) => Object.freeze(value)));
  const isValid = frozenDiagnostics.length === 0;
  return Object.freeze({
    diagnostics: frozenDiagnostics,
    isValid,
    operations: frozenOperations,
    requiresApply: isValid && frozenOperations.length > 0,
  });
}

export function checkConfigurationSynchronization(
  plan: ConfigurationSyncPlan,
): ConfigurationSyncCheckResult {
  return Object.freeze({ exitCode: plan.isValid && !plan.requiresApply ? 0 : 1, plan });
}

export function renderConfigurationSyncPlanJson(plan: ConfigurationSyncPlan): string {
  return JSON.stringify(plan);
}

export function renderConfigurationSyncPlanText(plan: ConfigurationSyncPlan): string {
  const lines = [
    `Configuration synchronization: ${plan.isValid ? "valid" : "invalid"}`,
    `Apply required: ${plan.requiresApply ? "yes" : "no"}`,
    "Operations:",
  ];
  if (plan.operations.length === 0) lines.push("- none");
  for (const operation of plan.operations) {
    const rename = operation.action === "rename" ? ` from ${operation.renamedFrom}` : "";
    lines.push(`- ${operation.action} ${operation.model.key}${rename}`);
  }
  lines.push("Diagnostics:");
  if (plan.diagnostics.length === 0) lines.push("- none");
  for (const value of plan.diagnostics) {
    const related = value.relatedModelKey === undefined ? "" : ` (${value.relatedModelKey})`;
    lines.push(`- [${value.code}] ${value.modelKey}${related}: ${value.message}`);
  }
  return lines.join("\n");
}

export function reportConfigurationSynchronization(
  plan: ConfigurationSyncPlan,
): ConfigurationSyncReport {
  return Object.freeze({
    check: checkConfigurationSynchronization(plan),
    json: renderConfigurationSyncPlanJson(plan),
    text: renderConfigurationSyncPlanText(plan),
  });
}

/** Reads persistence once and produces the canonical non-mutating synchronization decision. */
export async function prepareConfigurationSynchronization(input: {
  readonly models: readonly NormalizedContentModel[];
  readonly state: ConfigurationSyncStateReadPort;
}): Promise<PreparedConfigurationSynchronization> {
  const storedModels = Object.freeze(
    (await input.state.readConfigurationSyncState()).map(copyStoredModel).sort(compareByKey),
  );
  const plan = planConfigurationSynchronization({ models: input.models, storedModels });
  return Object.freeze({ plan, report: reportConfigurationSynchronization(plan), storedModels });
}

/** Creates the one incomplete draft that a newly synchronized page must own. */
export function createConfigurationSyncPageEntry(input: {
  readonly appliedAt: UnixMilliseconds;
  readonly entryId: ContentEntryId | string;
  readonly model: NormalizedContentModel;
  readonly snapshotId: ContentSnapshotId | string;
}): ConfigurationSyncPageEntry {
  if (input.model.kind !== "page") {
    throw new DomainError(
      "CONTENT_INVALID_STATE",
      "Only page models receive synchronized entries.",
    );
  }
  const entryId = contentEntryId(input.entryId);
  const snapshotId = contentSnapshotId(input.snapshotId);
  const model: ContentModelRoute = Object.freeze({
    key: contentModelKey(input.model.key),
    kind: "page",
    path: input.model.path,
  });
  const entry = createContentEntry({
    id: entryId,
    model,
    draft: {
      blocks: [],
      createdAt: input.appliedAt,
      entryId,
      fields: validateModelFields(input.model.fields, {}, "draft") as JsonObject,
      id: snapshotId,
      revision: 1,
      state: "draft",
      title: input.model.label ?? input.model.key,
      updatedAt: input.appliedAt,
      updatedBy: contentSyncActor,
    },
  });
  return Object.freeze({ entry, modelKey: model.key });
}

/** Applies a freshly prepared valid plan and allocates identities only for page creates. */
export async function applyPreparedConfigurationSynchronization(input: {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly models: readonly NormalizedContentModel[];
  readonly prepared: PreparedConfigurationSynchronization;
  readonly target: ConfigurationSyncApplyPort;
}): Promise<ApplyConfigurationSynchronizationResult> {
  if (!input.prepared.plan.isValid) {
    throw new DomainError(
      "CONTENT_INVALID_STATE",
      "Configuration synchronization plan is invalid.",
    );
  }
  const models = new Map(input.models.map((model) => [model.key, model]));
  const appliedAt = input.clock.now();
  const pageEntries: ConfigurationSyncPageEntry[] = [];
  for (const operation of input.prepared.plan.operations) {
    if (operation.action !== "create") continue;
    const model = models.get(operation.model.key);
    if (model?.kind !== "page") continue;
    pageEntries.push(
      createConfigurationSyncPageEntry({
        appliedAt,
        entryId: input.ids.next(),
        model,
        snapshotId: input.ids.next(),
      }),
    );
  }
  return input.target.applyConfigurationSynchronization({
    appliedAt,
    expectedStoredModels: input.prepared.storedModels,
    models: input.models,
    pageEntries,
    plan: input.prepared.plan,
  });
}
