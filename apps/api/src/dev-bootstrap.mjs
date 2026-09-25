import { NodeSecurityService, openNodeDatabase } from "@lacecms/platform-node";
import { unixMilliseconds } from "@lacecms/domain";

const databasePath = process.env.LACE_DATABASE_PATH;
if (databasePath === undefined || databasePath.trim().length === 0) {
  throw new Error("Invalid Node environment: LACE_DATABASE_PATH.");
}

const database = openNodeDatabase(databasePath);
try {
  const security = new NodeSecurityService(database.connection, () => unixMilliseconds(Date.now()));
  const setup = await security.createSetupToken();
  console.info(
    `First-admin setup token (shown once; expires ${new Date(Number(setup.expiresAt)).toISOString()}):`,
  );
  console.info(setup.token);
} finally {
  database.connection.close();
}
