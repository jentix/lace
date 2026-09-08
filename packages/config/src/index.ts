import {
  defineBlockRegistry,
  MAX_SLUG_LENGTH,
  sha256CanonicalJson,
  toBlockMetadata,
  toBlockRegistryMetadata,
  toFieldMetadata,
} from "@lacecms/content";
import type {
  BlockDefinition,
  BlockMetadata,
  BlockRegistry,
  FieldDefinition,
  FieldIsRequired,
  FieldValue,
  JsonValue,
} from "@lacecms/content";

export const packageName = "@lacecms/config";

const STABLE_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const FIELD_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/u;
const BLOCK_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** Thrown when `lace.config.ts` contains an invalid or ambiguous definition. */
export class ConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/** Field descriptors indexed by their stable configuration field key. */
export type FieldMap = Readonly<Record<string, FieldDefinition>>;

/** The values inferred from a model's field descriptors. */
export type ModelFieldValues<Fields extends FieldMap> = Readonly<
  {
    [Key in keyof Fields as FieldIsRequired<Fields[Key]> extends true ? Key : never]: FieldValue<
      Fields[Key]
    >;
  } & {
    readonly [
      Key in keyof Fields as FieldIsRequired<Fields[Key]> extends true ? never : Key
    ]?: FieldValue<Fields[Key]>;
  }
>;

interface CommonModelInput<Fields extends FieldMap> {
  readonly blocks?: readonly string[];
  readonly description?: string;
  readonly fields?: Fields;
  readonly key: string;
  readonly label?: string;
  readonly renamedFrom?: string;
  readonly version: number;
}

/** Input accepted by `definePage`. */
export interface PageModelInput<
  Fields extends FieldMap = FieldMap,
> extends CommonModelInput<Fields> {
  readonly path: string;
}

/** Input accepted by `defineCollection`. */
export interface CollectionModelInput<
  Fields extends FieldMap = FieldMap,
> extends CommonModelInput<Fields> {
  readonly route: string;
}

interface NormalizedCommonModel<Fields extends FieldMap> {
  readonly blocks: readonly string[];
  readonly description?: string;
  readonly fields: Fields;
  readonly key: string;
  readonly label?: string;
  readonly renamedFrom?: string;
  readonly version: number;
}

/** A normalized singleton page model. */
export type PageModelDefinition<Fields extends FieldMap = FieldMap> =
  NormalizedCommonModel<Fields> & {
    readonly kind: "page";
    readonly path: string;
  };

/** A normalized multi-entry collection model. */
export type CollectionModelDefinition<Fields extends FieldMap = FieldMap> =
  NormalizedCommonModel<Fields> & {
    readonly kind: "collection";
    readonly route: string;
  };

/** Any model that can be included in a Lace configuration. */
export type ContentModelDefinition<Fields extends FieldMap = FieldMap> =
  | CollectionModelDefinition<Fields>
  | PageModelDefinition<Fields>;

interface NormalizedModelHashes {
  readonly projectionHash: string;
  readonly structureHash: string;
}

/** A normalized model ready for configuration synchronization. */
export type NormalizedContentModel<Fields extends FieldMap = FieldMap> =
  ContentModelDefinition<Fields> & NormalizedModelHashes;

/** Input accepted by the asynchronous portable configuration normalizer. */
export interface LaceConfigInput<Models extends readonly ContentModelDefinition[]> {
  readonly blocks?: readonly BlockDefinition[];
  readonly content: Models;
}

/** JSON-safe configuration sent to admin and public consumers. */
export interface PublicConfigProjection {
  readonly blocks: readonly BlockMetadata[];
  readonly content: readonly NormalizedContentModel[];
  readonly projectionHash: string;
  readonly structureHash: string;
}

/** Executable startup configuration, including runtime block validators. */
export interface RuntimeConfigProjection {
  readonly blocks: BlockRegistry;
  readonly content: readonly NormalizedContentModel[];
}

/** Complete portable configuration with explicit runtime and JSON projections. */
export interface NormalizedConfig<_Models extends readonly ContentModelDefinition[]> {
  readonly blocks: readonly BlockMetadata[];
  readonly content: readonly NormalizedContentModel[];
  readonly projectionHash: string;
  readonly public: PublicConfigProjection;
  readonly runtime: RuntimeConfigProjection;
  readonly structureHash: string;
}

type MutableJsonObject = { [key: string]: MutableJsonValue };
type MutableJsonValue = boolean | null | number | string | MutableJsonObject | MutableJsonValue[];

function fail(message: string): never {
  throw new ConfigurationError(message);
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue);
    }
    Object.freeze(value);
  }
  return value;
}

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string") {
    fail(`${name} must be a string.`);
  }
}

function assertOptionalDisplayValue(value: unknown, name: string): void {
  if (value !== undefined && typeof value !== "string") {
    fail(`${name} must be a string when provided.`);
  }
}

function assertStableKey(value: unknown, name: string): asserts value is string {
  assertString(value, name);
  if (!STABLE_KEY_PATTERN.test(value)) {
    fail(`${name} must be a lowercase kebab-case key.`);
  }
}

function assertVersion(value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    fail("version must be a positive integer.");
  }
}

function normalizeFields<Fields extends FieldMap>(value: Fields | undefined): Fields {
  if (value === undefined) {
    return deepFreeze({}) as Fields;
  }
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !isPlainObject(value)
  ) {
    fail("fields must be a plain object.");
  }

  const normalized: Record<string, FieldDefinition> = {};
  for (const [key, definition] of Object.entries(value)) {
    if (!FIELD_KEY_PATTERN.test(key)) {
      fail(`fields.${key} must be a valid field key.`);
    }
    if (definition === null || typeof definition !== "object" || Array.isArray(definition)) {
      fail(`fields.${key} must be a field definition.`);
    }
    normalized[key] = toFieldMetadata(definition as FieldDefinition);
  }
  return deepFreeze(normalized) as Fields;
}

function normalizeBlocks(value: readonly string[] | undefined): readonly string[] {
  if (value === undefined) {
    return deepFreeze([]);
  }
  if (!Array.isArray(value)) {
    fail("blocks must be an array of block keys.");
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const blockKey of value) {
    if (typeof blockKey !== "string" || !BLOCK_KEY_PATTERN.test(blockKey)) {
      fail("blocks must contain valid block keys.");
    }
    if (seen.has(blockKey)) {
      fail(`blocks contains duplicate block key "${blockKey}".`);
    }
    seen.add(blockKey);
    normalized.push(blockKey);
  }
  return deepFreeze(normalized);
}

function assertCanonicalRouteValue(value: unknown, name: string): asserts value is string {
  assertString(value, name);
  if (
    value.length === 0 ||
    !value.startsWith("/") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("\\") ||
    /\s/u.test(value) ||
    value.includes("//") ||
    (value.length > 1 && value.endsWith("/"))
  ) {
    fail(`${name} must be a canonical absolute path.`);
  }

  for (const segment of value.slice(1).split("/")) {
    if (segment === "." || segment === "..") {
      fail(`${name} must not contain dot segments.`);
    }
  }
}

/** Validates and returns a canonical fixed page path. */
export function normalizePagePath(path: string): string {
  assertCanonicalRouteValue(path, "path");
  if (path.includes(":")) {
    fail("path must not contain parameter segments.");
  }
  return path;
}

/** Validates and returns a canonical collection route with one `:slug` segment. */
export function normalizeCollectionRoute(route: string): string {
  assertCanonicalRouteValue(route, "route");
  const segments = route === "/" ? [] : route.slice(1).split("/");
  const slugSegments = segments.filter((segment) => segment === ":slug");
  if (
    slugSegments.length !== 1 ||
    segments.some((segment) => segment.includes(":") && segment !== ":slug")
  ) {
    fail("route must contain exactly one :slug segment and no other parameters.");
  }
  return route;
}

/** Resolves a validated collection route to one canonical public path. */
export function resolveCollectionRoute(route: string, slug: string): string {
  const normalizedRoute = normalizeCollectionRoute(route);
  if (
    typeof slug !== "string" ||
    slug.length === 0 ||
    slug.length > MAX_SLUG_LENGTH ||
    !SLUG_PATTERN.test(slug)
  ) {
    fail("slug must use lowercase ASCII letters, digits, and single hyphens.");
  }
  const resolved = normalizedRoute.replace(":slug", slug);
  return normalizePagePath(resolved);
}

function normalizeCommonModel<Fields extends FieldMap>(
  input: CommonModelInput<Fields>,
): Omit<NormalizedCommonModel<Fields>, "values"> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    !isPlainObject(input)
  ) {
    fail("model must be a plain object.");
  }
  assertStableKey(input.key, "key");
  assertVersion(input.version);
  if (input.renamedFrom !== undefined) {
    assertStableKey(input.renamedFrom, "renamedFrom");
    if (input.renamedFrom === input.key) {
      fail("renamedFrom must differ from key.");
    }
  }
  assertOptionalDisplayValue(input.label, "label");
  assertOptionalDisplayValue(input.description, "description");

  const normalized: NormalizedCommonModel<Fields> = {
    blocks: normalizeBlocks(input.blocks),
    ...(input.description === undefined ? {} : { description: input.description }),
    fields: normalizeFields(input.fields),
    key: input.key,
    ...(input.label === undefined ? {} : { label: input.label }),
    ...(input.renamedFrom === undefined ? {} : { renamedFrom: input.renamedFrom }),
    version: input.version,
  };
  return deepFreeze(normalized);
}

/** Defines a detached singleton page model with inferred field values. */
export function definePage<const Fields extends FieldMap = FieldMap>(
  input: PageModelInput<Fields>,
): PageModelDefinition<Fields> {
  const common = normalizeCommonModel(input);
  const definition: PageModelDefinition<Fields> = {
    ...common,
    kind: "page",
    path: normalizePagePath(input.path),
  };
  return deepFreeze(definition);
}

/** Defines a detached collection model with inferred field values. */
export function defineCollection<const Fields extends FieldMap = FieldMap>(
  input: CollectionModelInput<Fields>,
): CollectionModelDefinition<Fields> {
  const common = normalizeCommonModel(input);
  const definition: CollectionModelDefinition<Fields> = {
    ...common,
    kind: "collection",
    route: normalizeCollectionRoute(input.route),
  };
  return deepFreeze(definition);
}

function pageMatchesCollection(pagePath: string, collectionRoute: string): boolean {
  const pageSegments = pagePath === "/" ? [] : pagePath.slice(1).split("/");
  const routeSegments = collectionRoute === "/" ? [] : collectionRoute.slice(1).split("/");
  return (
    pageSegments.length === routeSegments.length &&
    pageSegments.every(
      (segment, index) => routeSegments[index] === ":slug" || routeSegments[index] === segment,
    )
  );
}

function assertUniqueModels(models: readonly ContentModelDefinition[]): void {
  const currentKeys = new Map<string, ContentModelDefinition>();
  const formerKeys = new Map<string, ContentModelDefinition>();
  const pagePaths = new Map<string, PageModelDefinition>();
  const collectionRoutes = new Map<string, CollectionModelDefinition>();

  for (const model of models) {
    const duplicateCurrent = currentKeys.get(model.key);
    if (duplicateCurrent !== undefined) {
      fail(`models "${duplicateCurrent.key}" and "${model.key}" share key "${model.key}".`);
    }
    if (formerKeys.has(model.key)) {
      fail(`model key "${model.key}" duplicates a renamedFrom key.`);
    }
    currentKeys.set(model.key, model);

    if (model.renamedFrom !== undefined) {
      if (currentKeys.has(model.renamedFrom)) {
        fail(`renamedFrom "${model.renamedFrom}" duplicates a model key.`);
      }
      const duplicateFormer = formerKeys.get(model.renamedFrom);
      if (duplicateFormer !== undefined) {
        fail(
          `models "${duplicateFormer.key}" and "${model.key}" share renamedFrom "${model.renamedFrom}".`,
        );
      }
      formerKeys.set(model.renamedFrom, model);
    }

    if (model.kind === "page") {
      const duplicatePath = pagePaths.get(model.path);
      if (duplicatePath !== undefined) {
        fail(`pages "${duplicatePath.key}" and "${model.key}" share path "${model.path}".`);
      }
      pagePaths.set(model.path, model);
    } else {
      const duplicateRoute = collectionRoutes.get(model.route);
      if (duplicateRoute !== undefined) {
        fail(
          `collections "${duplicateRoute.key}" and "${model.key}" share route "${model.route}".`,
        );
      }
      collectionRoutes.set(model.route, model);
    }
  }

  for (const page of pagePaths.values()) {
    for (const collection of collectionRoutes.values()) {
      if (pageMatchesCollection(page.path, collection.route)) {
        fail(
          `page "${page.key}" path "${page.path}" collides with collection "${collection.key}".`,
        );
      }
    }
  }
}

function assertRegisteredModelBlocks(
  models: readonly ContentModelDefinition[],
  registry: BlockRegistry,
): void {
  for (const model of models) {
    for (const type of model.blocks) {
      if (registry.get(type) === undefined) {
        fail(`model "${model.key}" references unregistered block type "${type}".`);
      }
    }
  }
}

function asJsonValue(value: unknown): JsonValue {
  return value as JsonValue;
}

function omitDisplayMetadata(value: JsonValue): MutableJsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(omitDisplayMetadata);
  }
  const projection: MutableJsonObject = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (key !== "description" && key !== "label") {
      projection[key] = omitDisplayMetadata(nestedValue);
    }
  }
  return projection;
}

function modelForHash(model: ContentModelDefinition, registry: BlockRegistry): JsonValue {
  return asJsonValue({
    ...model,
    blockDefinitions: model.blocks.map((type) => toBlockMetadata(registry.get(type)!)),
  });
}

function normalizedModelForHash(model: NormalizedContentModel): JsonValue {
  const {
    projectionHash: _projectionHash,
    structureHash: _structureHash,
    ...serializableModel
  } = model;
  return asJsonValue(serializableModel);
}

/**
 * Normalizes models and produces hashes with the same asynchronous Web Crypto
 * implementation in Node and Cloudflare Workers. Callers can use top-level
 * `await` when exporting `lace.config.ts`.
 */
export async function defineConfig<const Models extends readonly ContentModelDefinition[]>(
  input: LaceConfigInput<Models>,
): Promise<NormalizedConfig<Models>> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    !isPlainObject(input)
  ) {
    fail("config must be a plain object.");
  }
  if (!Array.isArray(input.content)) {
    fail("config.content must be an array of models.");
  }

  const registry = defineBlockRegistry(input.blocks ?? []);
  const models = [...input.content];
  assertUniqueModels(models);
  assertRegisteredModelBlocks(models, registry);
  models.sort((left, right) => left.key.localeCompare(right.key));

  const normalizedModels = await Promise.all(
    models.map(async (model) => {
      const projection = modelForHash(model, registry);
      const normalized: NormalizedContentModel = {
        ...model,
        projectionHash: await sha256CanonicalJson(projection),
        structureHash: await sha256CanonicalJson(omitDisplayMetadata(projection)),
      };
      return deepFreeze(normalized);
    }),
  );

  const blocks = toBlockRegistryMetadata(registry);
  const projection = {
    blocks,
    content: normalizedModels.map(normalizedModelForHash),
  } as unknown as JsonValue;
  const publicProjection: PublicConfigProjection = {
    blocks,
    content: deepFreeze(normalizedModels),
    projectionHash: await sha256CanonicalJson(projection),
    structureHash: await sha256CanonicalJson(omitDisplayMetadata(projection)),
  };
  const normalized: NormalizedConfig<Models> = {
    ...publicProjection,
    public: deepFreeze({ ...publicProjection }),
    runtime: deepFreeze({ blocks: registry, content: publicProjection.content }),
  };
  return deepFreeze(normalized);
}
