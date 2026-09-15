import type { Actor } from "@lacecms/domain";
import type { ActorResolver } from "@lacecms/server";

/** Available only to Vitest integration fixtures; production entries never import this module. */
export function createTestActorResolver(actor: Actor): ActorResolver {
  if (!process.argv.some((argument) => argument.includes("vitest"))) {
    throw new Error("Test actor resolver is available only in the Vitest runtime.");
  }
  return Object.freeze({ resolve: async (): Promise<Actor> => actor });
}
