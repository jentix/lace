#!/usr/bin/env node
import { CliError, EXIT, loadEnvironment, parseArguments, presentResult, usage } from "./index.js";
import { runUpgradeCommand, upgradeUsage } from "./upgrade-command.js";
import { UpgradeError } from "./upgrade-input.js";

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    console.info(`${usage}\n${upgradeUsage}`);
    return EXIT.OK;
  }
  const json = argv.includes("--json");
  try {
    if (argv[0] === "upgrade") {
      if (argv.length === 2 && (argv[1] === "--help" || argv[1] === "-h")) {
        console.info(upgradeUsage);
        return EXIT.OK;
      }
      const result = await runUpgradeCommand(argv.slice(1));
      console.info(result.output);
      return result.exitCode;
    }
    const options = parseArguments(argv);
    const environment = loadEnvironment(options.target, process.env);
    // Runtime adapters are unnecessary for upgrade, help and invalid settings.
    const { runCommand } = await import("./commands.js");
    const result = await runCommand(options, environment);
    const output = presentResult(
      { ok: result.ok, code: result.code, message: result.message, data: result.data },
      options.json,
    );
    if (options.json || result.ok) console.info(output);
    else console.error(output);
    return result.exitCode;
  } catch (error) {
    if (error instanceof UpgradeError) {
      const output = presentResult({ ok: false, code: error.code, message: error.message }, json);
      if (json) console.info(output);
      else console.error(output);
      return error.code === "UPGRADE_INPUT" ? EXIT.CONFIG : EXIT.OPERATION;
    }
    const failure =
      error instanceof CliError
        ? error
        : new CliError(
            "OPERATION_FAILED",
            "Operation failed. Check the selected target, migration state, and configuration.",
            EXIT.OPERATION,
          );
    const output = presentResult({ ok: false, code: failure.code, message: failure.message }, json);
    if (json) console.info(output);
    else console.error(output);
    return failure.exitCode;
  }
}

void main().then((code) => {
  process.exitCode = code;
});
