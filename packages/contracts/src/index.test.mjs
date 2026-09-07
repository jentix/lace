import { expect, test } from "vitest";
import { packageName } from "../dist/index.js";
test("exports its package identity", () => expect(packageName).toBe("@lacecms/contracts"));
