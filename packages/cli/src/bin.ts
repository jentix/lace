#!/usr/bin/env node
import { CliError, EXIT, loadEnvironment, parseArguments, presentResult, usage } from "./index.js";
import { runCommand } from "./commands.js";

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    console.info(usage);
    return EXIT.OK;
  }
  const json = argv.includes("--json");
  try {
    const options = parseArguments(argv);
    const environment = loadEnvironment(options.target, process.env);
    const result = await runCommand(options, environment);
    const output = presentResult(
      { ok: result.ok, code: result.code, message: result.message, data: result.data },
      options.json,
    );
    if (options.json || result.ok) console.info(output);
    else console.error(output);
    return result.exitCode;
  } catch (error) {
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
