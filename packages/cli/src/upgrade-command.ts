import { EXIT, CliError } from "./index.js";
import { planUpgrade, presentUpgradePlan } from "./upgrade.js";
import { applyUpgrade } from "./upgrade-apply.js";
import { rollbackUpgrade } from "./upgrade-rollback.js";
import { readUpgradeInstructions, presentUpgradeInstructions } from "./upgrade-instructions.js";
import { readUpgradeManifest } from "./upgrade-input.js";
import { loadOperation, transactionPath } from "./upgrade-journal.js";

export const upgradeUsage =
  "Usage: lace upgrade --template <dir> [--apply] [--project <dir>] [--json]\n       lace upgrade --rollback [--project <dir>] [--json]\nDefault: read-only dry run. Apply resumes a matching pending upgrade; rollback restores the latest recorded filesystem upgrade.";

export function parseUpgradeArguments(
  argv: readonly string[],
  cwd = process.cwd(),
): {
  project: string;
  template: string | undefined;
  json: boolean;
  action: "review" | "apply" | "rollback";
} {
  let project = cwd;
  let template: string | undefined;
  let json = false;
  let action: "review" | "apply" | "rollback" = "review";
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]!;
    if (seen.has(flag)) throw new CliError("USAGE", upgradeUsage, EXIT.USAGE);
    seen.add(flag);
    if (flag === "--apply" || flag === "--rollback") {
      if (action !== "review") throw new CliError("USAGE", upgradeUsage, EXIT.USAGE);
      action = flag === "--apply" ? "apply" : "rollback";
      continue;
    }
    if (flag === "--json") {
      json = true;
      continue;
    }
    if (flag !== "--project" && flag !== "--template")
      throw new CliError("USAGE", upgradeUsage, EXIT.USAGE);
    const value = argv[++index];
    if (value === undefined || value.trim().length === 0 || value.startsWith("--"))
      throw new CliError("USAGE", upgradeUsage, EXIT.USAGE);
    if (flag === "--project") project = value;
    else template = value;
  }
  if (action === "rollback" ? template !== undefined : template === undefined)
    throw new CliError("USAGE", upgradeUsage, EXIT.USAGE);
  return { project, template, json, action };
}

export async function runUpgradeCommand(
  argv: readonly string[],
): Promise<{ output: string; exitCode: number }> {
  const options = parseUpgradeArguments(argv);
  if (options.action !== "review") {
    const outcome =
      options.action === "rollback"
        ? await rollbackUpgrade(options)
        : await applyUpgrade({ project: options.project, template: options.template! });
    const code = `UPGRADE_${outcome.status.toUpperCase().replaceAll("-", "_")}`;
    const message = `Upgrade ${outcome.status}: ${outcome.fromVersion} -> ${outcome.toVersion}.${outcome.conflictPath === null ? "" : ` Review artifacts at ${outcome.conflictPath}; resolve working files explicitly and retry.`}${outcome.recoveryPath === null ? "" : ` Recovery metadata: ${outcome.recoveryPath}.`}`;
    const guidance = presentUpgradeInstructions(
      outcome.instructions?.templateVersion ??
        (options.action === "rollback" ? outcome.fromVersion : outcome.toVersion),
      outcome.instructions,
    );
    return {
      output: options.json
        ? JSON.stringify({
            ok: outcome.status !== "conflicts",
            code,
            message,
            data: outcome,
            guidance,
          })
        : `${message}\n${guidance}`,
      exitCode: outcome.status === "conflicts" ? EXIT.PENDING : EXIT.OK,
    };
  }
  const target = await readUpgradeManifest(options.template!);
  const instructions = await readUpgradeInstructions(options.template!, target.templateVersion);
  const recovery = await loadOperation(options.project);
  const plan = await planUpgrade({ project: options.project, template: options.template! });
  const pending =
    recovery?.pointer.phase === "applying" || recovery?.pointer.phase === "rolling-back";
  const code = pending
    ? "UPGRADE_RECOVERY_PENDING"
    : plan.conflicts > 0
      ? "UPGRADE_CONFLICTS"
      : "UPGRADE_PLAN";
  const message = pending
    ? `Upgrade recovery pending (${recovery.pointer.phase}) at ${transactionPath(recovery.pointer.id)}. Repeat matching --apply or --rollback in the recorded direction. No files written.`
    : `Upgrade dry run: ${plan.changes} change(s), ${plan.conflicts} conflict(s). No files written.`;
  const guidance = presentUpgradeInstructions(target.templateVersion, instructions);
  return {
    output: options.json
      ? JSON.stringify({
          ok: !pending && plan.conflicts === 0,
          code,
          message,
          data: plan,
          instructions,
          guidance,
          recovery: pending
            ? { phase: recovery.pointer.phase, path: transactionPath(recovery.pointer.id) }
            : null,
        })
      : `${pending ? `${message}\n` : ""}${presentUpgradePlan(plan)}\n${guidance}`,
    exitCode: pending ? EXIT.OPERATION : plan.conflicts > 0 ? EXIT.PENDING : EXIT.OK,
  };
}
