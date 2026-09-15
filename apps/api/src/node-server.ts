import { getRequestListener } from "@hono/node-server";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type {
  CreateNodeRuntimeInput,
  NodeRuntime,
  NodeRuntimeSettings,
} from "@lacecms/platform-node";

const protectedLocalPaths = new Set(["/health/live", "/health/ready"]);

function gatewayResponse(status: number, message: string): Response {
  return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message } }, { status });
}

function isLocalPath(pathname: string): boolean {
  return pathname.startsWith("/api/") || protectedLocalPaths.has(pathname);
}

function proxyTarget(settings: NodeRuntimeSettings, pathname: string): URL | undefined {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return settings.adminDevOrigin;
  return settings.siteDevOrigin;
}

function proxyHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  for (const name of [
    "connection",
    "forwarded",
    "host",
    "keep-alive",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
  ]) {
    headers.delete(name);
  }
  return headers;
}

/** Routes the API and health namespaces locally, and development frontend paths through one origin. */
export function createNodeDevelopmentGateway(
  apiFetch: (request: Request) => Response | Promise<Response>,
  settings: NodeRuntimeSettings,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const source = new URL(request.url);
    if (isLocalPath(source.pathname)) return apiFetch(request);
    const target = proxyTarget(settings, source.pathname);
    if (target === undefined) {
      return gatewayResponse(502, "Development upstream is not configured.");
    }
    const destination = new URL(`${source.pathname}${source.search}`, target);
    try {
      const body = request.method === "GET" || request.method === "HEAD" ? undefined : request.body;
      const init =
        body === undefined || body === null
          ? { headers: proxyHeaders(request), method: request.method }
          : {
              body,
              duplex: "half" as const,
              headers: proxyHeaders(request),
              method: request.method,
            };
      return await fetch(new Request(destination, init));
    } catch {
      return gatewayResponse(502, "Development upstream is unavailable.");
    }
  };
}

export interface NodeServer {
  readonly close: () => Promise<void>;
  readonly server: Server;
  readonly url: URL;
}

export async function startNodeServer(input: {
  readonly developmentGateway?: boolean;
  readonly runtime: NodeRuntime;
  readonly settings: NodeRuntimeSettings;
}): Promise<NodeServer> {
  const fetch = input.developmentGateway
    ? createNodeDevelopmentGateway(input.runtime.app.fetch, input.settings)
    : input.runtime.app.fetch;
  const server = createServer(getRequestListener(fetch, { overrideGlobalObjects: false }));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(input.settings.port, input.settings.host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Node server did not expose a TCP address.");
  }
  return Object.freeze({
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      ),
    server,
    url: new URL(`http://${input.settings.host}:${address.port}`),
  });
}

export type NodeApiConfig = CreateNodeRuntimeInput["config"];
