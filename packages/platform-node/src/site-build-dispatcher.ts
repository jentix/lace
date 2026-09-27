import {
  dispatcherRetryDelay,
  siteBuildRetryPolicy,
  type Clock,
  type DispatcherRetryPolicy,
  type SiteBuildDispatchPort,
  type SiteBuildTrigger,
  type SiteBuildWorkLease,
} from "@lacecms/application";
import { unixMilliseconds } from "@lacecms/domain";

export interface NodeSiteBuildDispatcherOptions {
  readonly clock: Clock;
  readonly logger: { error(entry: { readonly buildId: string; readonly reason: string }): void };
  readonly policy?: DispatcherRetryPolicy;
  readonly random?: () => number;
  readonly trigger: SiteBuildTrigger;
  readonly work: SiteBuildDispatchPort;
}

/** One recoverable pass; process scheduling belongs to the deployment composition. */
export class NodeSiteBuildDispatcher {
  private readonly policy: DispatcherRetryPolicy;
  private readonly random: () => number;

  public constructor(private readonly options: NodeSiteBuildDispatcherOptions) {
    this.policy = options.policy ?? siteBuildRetryPolicy;
    this.random = options.random ?? Math.random;
  }

  public async runOnce(limit = 10): Promise<void> {
    const leases = await this.options.work.claimSiteBuilds({
      limit,
      now: this.options.clock.now(),
    });
    for (const lease of leases) await this.dispatchLease(lease);
  }

  private async dispatchLease(lease: SiteBuildWorkLease): Promise<void> {
    let result: Awaited<ReturnType<SiteBuildTrigger["trigger"]>>;
    try {
      result = await this.options.trigger.trigger({
        buildId: lease.buildId,
        targetVersion: lease.targetVersion,
      });
    } catch {
      await this.fail(lease, "trigger_unavailable");
      return;
    }
    if (result.status === "accepted") {
      await this.options.work.recordSiteBuildAccepted({
        leaseId: lease.id,
        now: this.options.clock.now(),
        providerBuildId: result.providerBuildId,
      });
      return;
    }
    if (result.status === "succeeded") {
      await this.options.work.recordSiteBuildSuccess({
        leaseId: lease.id,
        now: this.options.clock.now(),
      });
      return;
    }
    await this.fail(lease, result.reason);
  }

  private async fail(lease: SiteBuildWorkLease, reason: string): Promise<void> {
    const failedAt = this.options.clock.now();
    const failedAttempt = lease.event.attempts + 1;
    const terminal = failedAttempt >= this.policy.maxAttempts;
    const safeReason =
      reason === "trigger_unavailable" || reason === "build_timeout" ? reason : "provider_failed";
    this.options.logger.error({ buildId: lease.buildId, reason: safeReason });
    await this.options.work.recordSiteBuildFailure({
      leaseId: lease.id,
      now: failedAt,
      reason: safeReason,
      terminal,
      ...(terminal
        ? {}
        : {
            retryAt: unixMilliseconds(
              failedAt + dispatcherRetryDelay(this.policy, failedAttempt, this.random()),
            ),
          }),
    });
  }
}
