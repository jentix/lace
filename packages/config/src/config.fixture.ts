import { field } from "@lacecms/content";
import { defineCollection, defineConfig, definePage } from "./index.js";

export default await defineConfig({
  content: [
    definePage({
      blocks: ["hero"],
      key: "home",
      path: "/",
      version: 1,
    }),
    defineCollection({
      fields: { publishedAt: field.date({ required: true }) },
      key: "posts",
      route: "/blog/:slug",
      version: 1,
    }),
  ],
});
