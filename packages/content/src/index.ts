/** A JSON primitive that can be transported between Lace runtimes. */
export type JsonPrimitive = boolean | null | number | string;

/** A portable JSON value. Field descriptors never retain executable values. */
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

/** A portable JSON object. */
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/** Field kinds available in the first Lace content-model DSL. */
export type FieldType =
  | "boolean"
  | "date"
  | "datetime"
  | "media"
  | "number"
  | "richText"
  | "select"
  | "text"
  | "textarea"
  | "url";

/** Options common to every field builder. */
export interface CommonFieldOptions<Value> {
  readonly defaultValue?: Value;
  readonly description?: string;
  readonly label?: string;
  readonly required?: boolean;
}

/** String-length constraints supported by text and textarea fields. */
export interface StringFieldOptions extends CommonFieldOptions<string> {
  readonly maxLength?: number;
  readonly minLength?: number;
}

/** Numeric bounds supported by number fields. */
export interface NumberFieldOptions extends CommonFieldOptions<number> {
  readonly max?: number;
  readonly min?: number;
}

/** Options supported by boolean fields. */
export type BooleanFieldOptions = CommonFieldOptions<boolean>;

/** Options supported by date, datetime, URL, and media fields. */
export type StringValueFieldOptions = CommonFieldOptions<string>;

/** Options supported by a rich-text field before Session 2B document checks. */
export interface RichTextFieldOptions extends CommonFieldOptions<JsonObject> {}

/** Options supported by select fields. */
export interface SelectFieldOptions<Choices extends readonly string[]> extends CommonFieldOptions<
  NoInfer<Choices[number]>
> {
  readonly options: Choices;
}

type RequiredFrom<Options> = "required" extends keyof Options
  ? Options extends { readonly required: infer Required extends boolean }
    ? Required
    : boolean
  : false;

type PropertyFrom<Options, Key extends string> = Key extends keyof Options
  ? Options extends { readonly [Name in Key]: infer Value }
    ? { readonly [Name in Key]: Value }
    : Options extends { readonly [Name in Key]?: infer Value }
      ? { readonly [Name in Key]?: Value }
      : {}
  : {};

type DefaultFrom<Options> = PropertyFrom<Options, "defaultValue">;

type LabelAndDescriptionFrom<Options> = PropertyFrom<Options, "label"> &
  PropertyFrom<Options, "description">;

type CommonDefinition<Type extends FieldType, Options> = {
  readonly required: RequiredFrom<Options>;
  readonly type: Type;
} & DefaultFrom<Options> &
  LabelAndDescriptionFrom<Options>;

type StringConstraintsFrom<Options> = PropertyFrom<Options, "minLength"> &
  PropertyFrom<Options, "maxLength">;

type NumberConstraintsFrom<Options> = PropertyFrom<Options, "min"> & PropertyFrom<Options, "max">;

/** A text-field descriptor. */
export type TextFieldDefinition<Options extends StringFieldOptions = StringFieldOptions> =
  CommonDefinition<"text", Options> & StringConstraintsFrom<Options>;

/** A textarea-field descriptor. */
export type TextareaFieldDefinition<Options extends StringFieldOptions = StringFieldOptions> =
  CommonDefinition<"textarea", Options> & StringConstraintsFrom<Options>;

/** A rich-text-field descriptor. */
export type RichTextFieldDefinition<Options extends RichTextFieldOptions = RichTextFieldOptions> =
  CommonDefinition<"richText", Options>;

/** A number-field descriptor. */
export type NumberFieldDefinition<Options extends NumberFieldOptions = NumberFieldOptions> =
  CommonDefinition<"number", Options> & NumberConstraintsFrom<Options>;

/** A boolean-field descriptor. */
export type BooleanFieldDefinition<Options extends BooleanFieldOptions = BooleanFieldOptions> =
  CommonDefinition<"boolean", Options>;

/** A date-field descriptor. */
export type DateFieldDefinition<Options extends StringValueFieldOptions = StringValueFieldOptions> =
  CommonDefinition<"date", Options>;

/** A datetime-field descriptor. */
export type DatetimeFieldDefinition<
  Options extends StringValueFieldOptions = StringValueFieldOptions,
> = CommonDefinition<"datetime", Options>;

/** A URL-field descriptor. */
export type UrlFieldDefinition<Options extends StringValueFieldOptions = StringValueFieldOptions> =
  CommonDefinition<"url", Options>;

/** A media-field descriptor that stores a media identifier. */
export type MediaFieldDefinition<
  Options extends StringValueFieldOptions = StringValueFieldOptions,
> = CommonDefinition<"media", Options>;

/** A select-field descriptor. */
export type SelectFieldDefinition<
  Choices extends readonly string[] = readonly string[],
  Options extends SelectFieldOptions<Choices> = SelectFieldOptions<Choices>,
> = CommonDefinition<"select", Options> & { readonly options: Choices };

/** The discriminated union of all currently supported field descriptors. */
export type FieldDefinition =
  | BooleanFieldDefinition
  | DateFieldDefinition
  | DatetimeFieldDefinition
  | MediaFieldDefinition
  | NumberFieldDefinition
  | RichTextFieldDefinition
  | SelectFieldDefinition
  | TextareaFieldDefinition
  | TextFieldDefinition
  | UrlFieldDefinition;

/** The submitted value type associated with a field descriptor. */
export type FieldValue<Definition extends FieldDefinition> = Definition["type"] extends "boolean"
  ? boolean
  : Definition["type"] extends "number"
    ? number
    : Definition["type"] extends "richText"
      ? JsonObject
      : Definition["type"] extends "select"
        ? Definition extends { readonly options: readonly (infer Choice)[] }
          ? Choice
          : never
        : string;

/** Whether a descriptor makes a model property required through `required` or a default. */
export type FieldIsRequired<Definition extends FieldDefinition> = Definition extends {
  readonly defaultValue: unknown;
}
  ? true
  : Definition extends { readonly required: true }
    ? true
    : false;

/** Serializable form metadata has the same safe data shape as a field descriptor. */
export type FieldMetadata = FieldDefinition;

/** Thrown when a field builder receives a non-portable or contradictory option. */
export class FieldConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "FieldConfigurationError";
  }
}

type MutableJsonObject = { [key: string]: MutableJsonValue };
type MutableJsonValue = boolean | null | number | string | MutableJsonObject | MutableJsonValue[];

function fail(path: string, message: string): never {
  throw new FieldConfigurationError(`${path} ${message}`);
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function isArrayIndex(key: string): boolean {
  if (key === "0") {
    return true;
  }

  if (!/^[1-9][0-9]*$/u.test(key)) {
    return false;
  }

  const index = Number(key);
  return Number.isSafeInteger(index) && index < 4_294_967_295;
}

function normalizeJsonValue(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
): MutableJsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail(path, "must not contain a non-finite number.");
    }

    return value;
  }

  if (typeof value !== "object") {
    fail(path, "must be JSON-serializable.");
  }

  if (ancestors.has(value)) {
    fail(path, "must not contain a cyclic reference.");
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);
      for (const key of keys) {
        if (key === "length") {
          continue;
        }

        if (typeof key !== "string" || !isArrayIndex(key)) {
          fail(path, "must not contain non-index array properties or symbols.");
        }

        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined) {
          fail(`${path}[${key}]`, "must contain an own data property.");
        }
        if ("get" in descriptor || "set" in descriptor) {
          fail(`${path}[${key}]`, "must not contain accessor properties.");
        }
      }

      const normalized: MutableJsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          fail(`${path}[${index}]`, "must not contain sparse array entries.");
        }

        normalized.push(normalizeJsonValue(value[index], `${path}[${index}]`, ancestors));
      }

      return normalized;
    }

    if (!isPlainObject(value)) {
      fail(path, "must not contain a non-plain object.");
    }

    const normalized: MutableJsonObject = {};
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        fail(path, "must not contain symbol keys.");
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined) {
        fail(`${path}.${key}`, "must contain an own data property.");
      }
      if ("get" in descriptor || "set" in descriptor) {
        fail(`${path}.${key}`, "must not contain accessor properties.");
      }
      if (!descriptor.enumerable) {
        fail(`${path}.${key}`, "must contain an enumerable data property.");
      }

      normalized[key] = normalizeJsonValue(descriptor.value, `${path}.${key}`, ancestors);
    }

    return normalized;
  } finally {
    ancestors.delete(value);
  }
}

function normalizeOptions(options: unknown): MutableJsonObject {
  const normalized = normalizeJsonValue(options, "options", new WeakSet<object>());
  if (normalized === null || Array.isArray(normalized) || typeof normalized !== "object") {
    fail("options", "must be a plain object.");
  }

  return normalized;
}

function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }

    Object.freeze(value);
  }

  return value;
}

function readOptionalString(options: MutableJsonObject, name: string): string | undefined {
  const value = options[name];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    fail(`options.${name}`, "must be a string.");
  }

  return value;
}

function readOptionalBoolean(options: MutableJsonObject, name: string): boolean | undefined {
  const value = options[name];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    fail(`options.${name}`, "must be a boolean.");
  }

  return value;
}

function readOptionalFiniteNumber(
  options: MutableJsonObject,
  name: string,
  integer: boolean,
): number | undefined {
  const value = options[name];
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (integer && !Number.isSafeInteger(value)) ||
    (integer && value < 0)
  ) {
    fail(
      `options.${name}`,
      integer ? "must be a non-negative safe integer." : "must be a finite number.",
    );
  }

  return value;
}

function addCommonOptions(definition: Record<string, unknown>, options: MutableJsonObject): void {
  const label = readOptionalString(options, "label");
  if (label !== undefined) {
    definition.label = label;
  }

  const description = readOptionalString(options, "description");
  if (description !== undefined) {
    definition.description = description;
  }

  definition.required = readOptionalBoolean(options, "required") ?? false;
}

function assertAllowedOptions(options: MutableJsonObject, allowed: readonly string[]): void {
  for (const key of Object.keys(options)) {
    if (!allowed.includes(key)) {
      fail(`options.${key}`, "is not supported by this field type.");
    }
  }
}

function addDefault(
  definition: Record<string, unknown>,
  options: MutableJsonObject,
  isValid: (value: MutableJsonValue) => boolean,
  message: string,
): void {
  if (!Object.hasOwn(options, "defaultValue")) {
    return;
  }

  const value = options.defaultValue;
  if (value === undefined || !isValid(value)) {
    fail("options.defaultValue", message);
  }

  definition.defaultValue = value;
}

function buildStringField<Type extends "text" | "textarea", Options extends StringFieldOptions>(
  type: Type,
  input: Options | undefined,
): Type extends "text" ? TextFieldDefinition<Options> : TextareaFieldDefinition<Options> {
  const options = normalizeOptions(input ?? {});
  assertAllowedOptions(options, [
    "defaultValue",
    "description",
    "label",
    "maxLength",
    "minLength",
    "required",
  ]);
  const definition: Record<string, unknown> = { type };
  addCommonOptions(definition, options);

  const minLength = readOptionalFiniteNumber(options, "minLength", true);
  const maxLength = readOptionalFiniteNumber(options, "maxLength", true);
  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    fail("options", "must not set minLength greater than maxLength.");
  }

  if (minLength !== undefined) {
    definition.minLength = minLength;
  }
  if (maxLength !== undefined) {
    definition.maxLength = maxLength;
  }

  addDefault(
    definition,
    options,
    (value) =>
      typeof value === "string" &&
      (minLength === undefined || value.length >= minLength) &&
      (maxLength === undefined || value.length <= maxLength),
    "must be a string that conforms to the declared length constraints.",
  );

  return deepFreeze(definition) as Type extends "text"
    ? TextFieldDefinition<Options>
    : TextareaFieldDefinition<Options>;
}

function buildStringValueField<
  Type extends "date" | "datetime" | "media" | "url",
  Options extends StringValueFieldOptions,
>(type: Type, input: Options | undefined): FieldDefinition {
  const options = normalizeOptions(input ?? {});
  assertAllowedOptions(options, ["defaultValue", "description", "label", "required"]);
  const definition: Record<string, unknown> = { type };
  addCommonOptions(definition, options);
  addDefault(definition, options, (value) => typeof value === "string", "must be a string.");
  return deepFreeze(definition) as FieldDefinition;
}

/** Builders for portable Lace field descriptors. */
export const field = {
  /** Define a single-line text field. */
  text<const Options extends StringFieldOptions = StringFieldOptions>(
    options?: Options,
  ): TextFieldDefinition<Options> {
    return buildStringField("text", options);
  },

  /** Define a multiline text field. */
  textarea<const Options extends StringFieldOptions = StringFieldOptions>(
    options?: Options,
  ): TextareaFieldDefinition<Options> {
    return buildStringField("textarea", options);
  },

  /** Define a Tiptap JSON field; document semantics are validated in Session 2B. */
  richText<const Options extends RichTextFieldOptions = RichTextFieldOptions>(
    options?: Options,
  ): RichTextFieldDefinition<Options> {
    const normalized = normalizeOptions(options ?? {});
    assertAllowedOptions(normalized, ["defaultValue", "description", "label", "required"]);
    const definition: Record<string, unknown> = { type: "richText" };
    addCommonOptions(definition, normalized);
    addDefault(
      definition,
      normalized,
      (value) => value !== null && !Array.isArray(value) && typeof value === "object",
      "must be a JSON object.",
    );
    return deepFreeze(definition) as RichTextFieldDefinition<Options>;
  },

  /** Define a finite numeric field. */
  number<const Options extends NumberFieldOptions = NumberFieldOptions>(
    options?: Options,
  ): NumberFieldDefinition<Options> {
    const normalized = normalizeOptions(options ?? {});
    assertAllowedOptions(normalized, [
      "defaultValue",
      "description",
      "label",
      "max",
      "min",
      "required",
    ]);
    const definition: Record<string, unknown> = { type: "number" };
    addCommonOptions(definition, normalized);
    const min = readOptionalFiniteNumber(normalized, "min", false);
    const max = readOptionalFiniteNumber(normalized, "max", false);
    if (min !== undefined && max !== undefined && min > max) {
      fail("options", "must not set min greater than max.");
    }
    if (min !== undefined) {
      definition.min = min;
    }
    if (max !== undefined) {
      definition.max = max;
    }
    addDefault(
      definition,
      normalized,
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        (min === undefined || value >= min) &&
        (max === undefined || value <= max),
      "must be a finite number that conforms to the declared numeric bounds.",
    );
    return deepFreeze(definition) as NumberFieldDefinition<Options>;
  },

  /** Define a boolean field. */
  boolean<const Options extends BooleanFieldOptions = BooleanFieldOptions>(
    options?: Options,
  ): BooleanFieldDefinition<Options> {
    const normalized = normalizeOptions(options ?? {});
    assertAllowedOptions(normalized, ["defaultValue", "description", "label", "required"]);
    const definition: Record<string, unknown> = { type: "boolean" };
    addCommonOptions(definition, normalized);
    addDefault(definition, normalized, (value) => typeof value === "boolean", "must be a boolean.");
    return deepFreeze(definition) as BooleanFieldDefinition<Options>;
  },

  /** Define a date string field. */
  date<const Options extends StringValueFieldOptions = StringValueFieldOptions>(
    options?: Options,
  ): DateFieldDefinition<Options> {
    return buildStringValueField("date", options) as DateFieldDefinition<Options>;
  },

  /** Define a datetime string field. */
  datetime<const Options extends StringValueFieldOptions = StringValueFieldOptions>(
    options?: Options,
  ): DatetimeFieldDefinition<Options> {
    return buildStringValueField("datetime", options) as DatetimeFieldDefinition<Options>;
  },

  /** Define a select field with a non-empty unique list of string choices. */
  select<
    const Options extends {
      readonly options: readonly [string, ...string[]];
    },
  >(
    options: Options & SelectFieldOptions<Options["options"]>,
  ): SelectFieldDefinition<Options["options"], Options & SelectFieldOptions<Options["options"]>> {
    const normalized = normalizeOptions(options);
    assertAllowedOptions(normalized, [
      "defaultValue",
      "description",
      "label",
      "options",
      "required",
    ]);
    const rawChoices = normalized.options;
    if (!Array.isArray(rawChoices) || rawChoices.length === 0) {
      fail("options.options", "must be a non-empty array of strings.");
    }

    const choices: string[] = [];
    const seen = new Set<string>();
    for (const [index, choice] of rawChoices.entries()) {
      if (typeof choice !== "string") {
        fail(`options.options[${index}]`, "must be a string.");
      }
      if (seen.has(choice)) {
        fail(`options.options[${index}]`, "must not duplicate a select choice.");
      }
      seen.add(choice);
      choices.push(choice);
    }

    const definition: Record<string, unknown> = { options: choices, type: "select" };
    addCommonOptions(definition, normalized);
    addDefault(
      definition,
      normalized,
      (value) => typeof value === "string" && seen.has(value),
      "must be one of the declared select choices.",
    );
    return deepFreeze(definition) as SelectFieldDefinition<
      Options["options"],
      Options & SelectFieldOptions<Options["options"]>
    >;
  },

  /** Define a URL string field; URL protocol validation is added in Session 2B. */
  url<const Options extends StringValueFieldOptions = StringValueFieldOptions>(
    options?: Options,
  ): UrlFieldDefinition<Options> {
    return buildStringValueField("url", options) as UrlFieldDefinition<Options>;
  },

  /** Define a field holding a media identifier. */
  media<const Options extends StringValueFieldOptions = StringValueFieldOptions>(
    options?: Options,
  ): MediaFieldDefinition<Options> {
    return buildStringValueField("media", options) as MediaFieldDefinition<Options>;
  },
} as const;

/**
 * Project a field descriptor into a detached, immutable JSON-safe admin form
 * representation. Runtime schemas and callbacks are deliberately absent.
 */
export function toFieldMetadata(definition: FieldDefinition): FieldMetadata {
  const normalized = normalizeJsonValue(definition, "definition", new WeakSet<object>());
  if (normalized === null || Array.isArray(normalized) || typeof normalized !== "object") {
    fail("definition", "must be a field-definition object.");
  }
  return deepFreeze(normalized) as FieldMetadata;
}
