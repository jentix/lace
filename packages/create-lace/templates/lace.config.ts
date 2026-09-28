import { defineCollection, defineConfig, definePage } from "@lacecms/config";
import { builtInBlocks, field } from "@lacecms/content";

export default await defineConfig({
  blocks: [builtInBlocks.hero, builtInBlocks.richText, builtInBlocks.image],
  content: [
    definePage({
      key: "home",
      version: 1,
      label: "Home",
      path: "/",
      blocks: ["hero", "richText", "image"],
    }),
    defineCollection({
      key: "posts",
      version: 1,
      label: "Posts",
      route: "/blog/:slug",
      fields: { summary: field.text() },
      blocks: ["hero", "richText", "image"],
    }),
  ],
});
