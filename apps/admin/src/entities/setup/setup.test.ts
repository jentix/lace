import { expect, test, vi } from "vitest";
import { stubClient } from "../../app/testing/index.js";
import { readSetupState } from "./setup.js";

test("setup reads are fresh and propagate failures", async () => {
  const loadSetupState = vi
    .fn()
    .mockResolvedValueOnce({ setupComplete: false })
    .mockResolvedValueOnce({ setupComplete: true })
    .mockRejectedValueOnce(new Error("Unavailable"));
  const client = stubClient({ loadSetupState });
  expect(await readSetupState(client)).toEqual({ setupComplete: false });
  expect(await readSetupState(client)).toEqual({ setupComplete: true });
  await expect(readSetupState(client)).rejects.toThrow("Unavailable");
});
