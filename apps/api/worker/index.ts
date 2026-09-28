import { createCloudflareWorker } from "@lacecms/platform-cloudflare";
import config from "../../../lace.config.ts";

/** Cloudflare Worker entry: the project configuration is bundled, never loaded per request. */
export default createCloudflareWorker({ config });
