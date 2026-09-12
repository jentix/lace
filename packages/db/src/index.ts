export const packageName = "@lacecms/db";

export const appliedMigrationQuery =
  "select hash, created_at from __drizzle_migrations order by created_at asc";

export interface AppliedMigration {
  readonly createdAt: number;
  readonly hash: string;
}

export * from "./schema.js";
