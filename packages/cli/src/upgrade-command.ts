import { EXIT, CliError } from "./index.js";
import { planUpgrade, presentUpgradePlan } from "./upgrade.js";

export const upgradeUsage =
  "Usage: lace upgrade --template <dir> [--project <dir>] [--json] (dry run; apply is available in Step 24B)";

export function parseUpgradeArguments(
  argv: readonly string[],
  cwd = process.cwd(),
): { project: string; template: string; json: boolean } {
  let project = cwd;
  let template: string | undefined;
  let json = false;
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]!;
    if (flag === "--apply")
      throw new CliError(
        "USAGE",
        "Upgrade apply is not implemented in 24A; use a dry run. Apply and recovery belong to Step 24B.",
        EXIT.USAGE,
      );
    if (seen.has(flag)) throw new CliError("USAGE", upgradeUsage, EXIT.USAGE);
    seen.add(flag);
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
  if (template === undefined) throw new CliError("USAGE", upgradeUsage, EXIT.USAGE);
  return { project, template, json };
}

export async function runUpgradeCommand(
  argv: readonly string[],
): Promise<{ output: string; exitCode: number }> {
  const options = parseUpgradeArguments(argv);
  const plan = await planUpgrade(options);
  const code = plan.conflicts > 0 ? "UPGRADE_CONFLICTS" : "UPGRADE_PLAN";
  return {
    output: options.json
      ? JSON.stringify({
          ok: plan.conflicts === 0,
          code,
          message: `Upgrade dry run: ${plan.changes} change(s), ${plan.conflicts} conflict(s). No files written.`,
          data: plan,
        })
      : presentUpgradePlan(plan),
    exitCode: plan.conflicts > 0 ? EXIT.PENDING : EXIT.OK,
  };
}
