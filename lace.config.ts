import { defineCollection, defineConfig, definePage } from "@lacecms/config";
import { builtInBlocks, field } from "@lacecms/content";

export default await defineConfig({
  blocks: [
    builtInBlocks.hero,
    builtInBlocks.richText,
    builtInBlocks.image,
    builtInBlocks.quote,
    builtInBlocks.cta,
  ],
  content: [
    definePage({
      key: "home",
      version: 2,
      label: "Home",
      path: "/",
      blocks: ["hero", "richText", "image", "quote", "cta"],
    }),
    definePage({
      key: "about",
      version: 1,
      label: "About",
      path: "/about",
      blocks: ["hero", "richText", "image", "quote", "cta"],
    }),
    defineCollection({
      key: "posts",
      version: 2,
      label: "Posts",
      route: "/blog/:slug",
      fields: {
        author: field.text(),
        category: field.select({ options: ["engineering", "design", "news"] }),
        publishedAt: field.date({ required: true }),
      },
      blocks: ["hero", "richText", "image", "quote", "cta"],
    }),
    defineCollection({
      key: "notes",
      version: 1,
      label: "Notes",
      route: "/notes/:slug",
      fields: { summary: field.text() },
      blocks: ["hero", "richText", "image", "quote", "cta"],
    }),
  ],
});
