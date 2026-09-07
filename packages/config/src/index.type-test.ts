import { field } from "@lacecms/content";
import { defineCollection, definePage } from "./index.js";
import type { ModelFieldValues } from "./index.js";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

const page = definePage({
  fields: {
    heading: field.text({ required: true }),
    visible: field.boolean(),
  },
  key: "home",
  path: "/",
  version: 1,
});
const collection = defineCollection({
  fields: { category: field.select({ options: ["design", "engineering"] as const }) },
  key: "posts",
  route: "/blog/:slug",
  version: 1,
});

type _pageValues = Expect<
  Equal<ModelFieldValues<typeof page.fields>, Readonly<{ heading: string; visible?: boolean }>>
>;
type _collectionValues = Expect<
  Equal<
    ModelFieldValues<typeof collection.fields>,
    Readonly<{ category?: "design" | "engineering" }>
  >
>;

// @ts-expect-error A model version is mandatory.
definePage({ key: "missing-version", path: "/missing" });

// @ts-expect-error A page must use a fixed path.
definePage({ key: "missing-path", version: 1 });

void page;
void collection;
