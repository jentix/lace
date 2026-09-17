import {
  defaultDispatcherRetryPolicy,
  dispatcherRetryDelay,
  type Clock,
  type DispatcherLeasePort,
  type DispatcherRetryPolicy,
  type MediaDeletionDispatchPort,
  type ObjectStorage,
} from "@lacecms/application";
import { mediaId, unixMilliseconds } from "@lacecms/domain";

const MEDIA_DELETION_EVENT = "media.delete.requested";

export interface MediaDeletionDispatcherLogger {
  error(entry: {
    readonly eventId: string;
    readonly mediaId?: string;
    readonly reason: string;
  }): void;
}

export interface NodeMediaDeletionDispatcherOptions {
  readonly clock: Clock;
  readonly logger: MediaDeletionDispatcherLogger;
  readonly policy?: DispatcherRetryPolicy;
  readonly random?: () => number;
  readonly storage: ObjectStorage;
  readonly work: DispatcherLeasePort & MediaDeletionDispatchPort;
}

function mediaIdFromPayload(payload: Record<string, unknown>): string | undefined {
  return typeof payload.mediaId === "string" && payload.mediaId.length > 0
    ? payload.mediaId
    : undefined;
}

function sanitizedReason(_error: unknown): string {
  return "storage_unavailable";
}

/** Processes a bounded non-overlapping batch; scheduling belongs to the composition root. */
export class NodeMediaDeletionDispatcher {
  private readonly policy: DispatcherRetryPolicy;
  private readonly random: () => number;

  public constructor(private readonly options: NodeMediaDeletionDispatcherOptions) {
    this.policy = options.policy ?? defaultDispatcherRetryPolicy;
    this.random = options.random ?? Math.random;
  }

  public async runOnce(limit = 10): Promise<void> {
    const claimedAt = this.options.clock.now();
    const leases = await this.options.work.claim({
      eventTypes: [MEDIA_DELETION_EVENT],
      limit,
      now: claimedAt,
    });
    for (const lease of leases) await this.dispatchLease(lease);
  }

  private async dispatchLease(
    lease: Awaited<ReturnType<DispatcherLeasePort["claim"]>>[number],
  ): Promise<void> {
    const rawMediaId = mediaIdFromPayload(lease.event.payload);
    if (rawMediaId === undefined) {
      this.options.logger.error({
        eventId: lease.event.id,
        reason: "invalid_media_deletion_event",
      });
      await this.options.work.complete({
        completedAt: this.options.clock.now(),
        leaseId: lease.id,
        outcome: "succeeded",
      });
      return;
    }
    const id = mediaId(rawMediaId);
    const media = await this.options.work.loadDeletingMedia(id);
    if (media === null) {
      await this.options.work.complete({
        completedAt: this.options.clock.now(),
        leaseId: lease.id,
        outcome: "succeeded",
      });
      return;
    }
    try {
      await this.options.storage.delete(media.storageKey);
      await this.options.work.completeMediaDeletion({
        completedAt: this.options.clock.now(),
        leaseId: lease.id,
        mediaId: id,
      });
    } catch (error) {
      const failedAt = this.options.clock.now();
      const failedAttempt = lease.event.attempts + 1;
      const terminal = failedAttempt >= this.policy.maxAttempts;
      const reason = sanitizedReason(error);
      this.options.logger.error({ eventId: lease.event.id, mediaId: id, reason });
      await this.options.work.failMediaDeletion({
        failedAt,
        leaseId: lease.id,
        mediaId: id,
        sanitizedError: reason,
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
}
