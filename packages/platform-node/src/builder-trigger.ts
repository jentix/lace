import type { BuildTriggerResult, SiteBuildRequest, SiteBuildTrigger } from "@lacecms/application";

const FAILURE_REASONS = new Set([
  "source_invalid",
  "install_failed",
  "build_failed",
  "version_changed",
]);

export interface NodeBuilderTriggerSettings {
  readonly baseUrl: URL;
  readonly secret: string;
  readonly fetch?: typeof fetch;
}

/** The only Node/VPS transport for the fixed-command builder. */
export class NodeBuilderSiteBuildTrigger implements SiteBuildTrigger {
  public constructor(private readonly settings: NodeBuilderTriggerSettings) {
    if (settings.secret.length < 32)
      throw new TypeError("Builder secret must be at least 32 characters.");
    if (settings.baseUrl.pathname !== "/" || settings.baseUrl.search || settings.baseUrl.hash)
      throw new TypeError("Builder URL must be an origin.");
  }

  public async trigger(input: SiteBuildRequest): Promise<BuildTriggerResult> {
    try {
      const response = await (this.settings.fetch ?? fetch)(
        new URL("build", this.settings.baseUrl),
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.settings.secret}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ buildId: input.buildId, targetVersion: input.targetVersion }),
          signal: AbortSignal.timeout(25 * 60_000),
        },
      );
      const text = await response.text();
      if (text.length > 512) return { status: "failed", reason: "trigger_unavailable" };
      const value = JSON.parse(text) as unknown;
      if (value === null || typeof value !== "object" || Array.isArray(value))
        return { status: "failed", reason: "trigger_unavailable" };
      const record = value as Record<string, unknown>;
      if (
        response.status === 200 &&
        Object.keys(record).length === 2 &&
        record.status === "succeeded" &&
        record.log === "Static build succeeded."
      )
        return { status: "succeeded" };
      if (
        response.status === 503 &&
        Object.keys(record).length === 3 &&
        record.status === "failed" &&
        typeof record.reason === "string" &&
        FAILURE_REASONS.has(record.reason) &&
        record.log === `Static build failed: ${record.reason}.`
      )
        return { status: "failed", reason: record.reason };
      return { status: "failed", reason: "trigger_unavailable" };
    } catch {
      return { status: "failed", reason: "trigger_unavailable" };
    }
  }
}
