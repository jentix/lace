import { fileURLToPath } from "node:url";
import { migrateNodeDatabase } from "./index.js";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(
    JSON.stringify(migrateNodeDatabase(process.env.LACE_DATABASE_PATH ?? "./lace.sqlite")),
  );
}
