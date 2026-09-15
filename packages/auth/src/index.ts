import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { actorId, type Actor, type Role } from "@lacecms/domain";

export const packageName = "@lacecms/auth";

export interface AuthRouteHandler {
  fetch(request: Request): Promise<Response>;
}

export interface SessionActorResolver {
  resolve(request: Request): Promise<Actor | null>;
}

export interface BetterAuthBoundary extends AuthRouteHandler {
  readonly actors: SessionActorResolver;
}

export interface CreateBetterAuthBoundaryInput {
  readonly database: object;
  readonly origin: URL;
  readonly production: boolean;
  readonly schema: Record<string, unknown>;
  readonly secret: string;
}

function laceRole(value: unknown): Role | undefined {
  return value === "admin" || value === "editor" || value === "viewer" ? value : undefined;
}

/** Creates the Node Better Auth boundary without leaking provider types to HTTP routes. */
export function createBetterAuthBoundary(input: CreateBetterAuthBoundaryInput): BetterAuthBoundary {
  const origin = input.origin.origin;
  const auth = betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: input.production,
      },
      disableCSRFCheck: false,
      disableOriginCheck: false,
    },
    basePath: "/api/auth",
    baseURL: new URL("/api/auth", origin).href,
    database: drizzleAdapter(input.database, {
      provider: "sqlite",
      schema: input.schema,
    }),
    emailAndPassword: {
      disableSignUp: true,
      enabled: true,
    },
    secret: input.secret,
    trustedOrigins: [origin],
    user: {
      additionalFields: {
        role: {
          defaultValue: "viewer",
          input: false,
          required: false,
          type: "string",
        },
      },
    },
  });

  return Object.freeze({
    actors: Object.freeze({
      resolve: async (request: Request) => {
        const session = await auth.api.getSession({ headers: request.headers });
        const role = laceRole(session?.user.role);
        return session === null || session === undefined || role === undefined
          ? null
          : Object.freeze({ id: actorId(session.user.id), role });
      },
    }),
    fetch: async (request: Request) => auth.handler(request),
  });
}
