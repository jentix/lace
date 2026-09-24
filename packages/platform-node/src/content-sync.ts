import {
  applyPreparedConfigurationSynchronization,
  prepareConfigurationSynchronization,
} from "@lacecms/application";
import type {
  ConfigurationSyncApplyPort,
  ConfigurationSyncStateReadPort,
} from "@lacecms/application";
import type { NormalizedContentModel } from "@lacecms/config";
import type { Clock, IdGenerator } from "@lacecms/application";

/** Runs the local operator flow without hiding the plan or bypassing guarded apply. */
export async function runLocalContentSync(input: {
  readonly check: boolean;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly models: readonly NormalizedContentModel[];
  readonly target: ConfigurationSyncApplyPort & ConfigurationSyncStateReadPort;
  readonly write: (message: string) => void;
}): Promise<number> {
  const prepared = await prepareConfigurationSynchronization({
    models: input.models,
    state: input.target,
  });
  input.write(prepared.report.text);
  if (input.check) return prepared.report.check.exitCode;
  if (!prepared.plan.isValid) {
    input.write("Sync blocked. Fix the diagnostics above and rerun pnpm content:sync.");
    return 1;
  }
  try {
    const result = await applyPreparedConfigurationSynchronization({
      clock: input.clock,
      ids: input.ids,
      models: input.models,
      prepared,
      target: input.target,
    });
    input.write(
      result.status === "noop" ? "No synchronization needed." : "Synchronization applied.",
    );
    return 0;
  } catch (error) {
    if (error instanceof Error && error.message.includes("stale")) {
      input.write("Sync plan is stale. Rerun pnpm content:sync to review current SQLite state.");
      return 1;
    }
    throw error;
  }
}
