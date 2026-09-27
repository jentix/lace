import { requirePermission, siteBuildId } from "@lacecms/domain";
import type { Actor } from "@lacecms/domain";
import type { BuildQueueReceipt, Clock, SiteBuildCommandPort } from "./index.js";

/** Administrator commands enqueue durable work without invoking a build provider. */
export class SiteBuildUseCases {
  public constructor(
    private readonly dependencies: { readonly clock: Clock; readonly builds: SiteBuildCommandPort },
  ) {}

  public request(actor: Actor): Promise<BuildQueueReceipt> {
    requirePermission(actor, "settings:manage");
    return this.dependencies.builds.requestBuild({
      requestedAt: this.dependencies.clock.now(),
      requestedBy: actor,
    });
  }

  public retry(actor: Actor, buildId: string): Promise<BuildQueueReceipt> {
    requirePermission(actor, "settings:manage");
    return this.dependencies.builds.requestBuild({
      requestedAt: this.dependencies.clock.now(),
      requestedBy: actor,
      retryOfBuildId: siteBuildId(buildId),
    });
  }
}
