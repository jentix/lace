const [command, outcome] = process.argv.slice(2);

if (!command || !outcome) {
  throw new Error("Usage: not-implemented.mjs <command> <success|failure>");
}

console.log(`${command}: not implemented in milestone 1`);
process.exit(outcome === "success" ? 0 : 1);
