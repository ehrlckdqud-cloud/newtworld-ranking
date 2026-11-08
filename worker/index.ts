import { pspAssets } from '../lib/game/psp-assets.mjs';
import { pspSolo } from "../lib/game/psp-solo.mjs";
import { packageBytes } from "../lib/game/package-bytes.mjs";
import { gateway } from "../lib/game/newtworld-gateway.mjs";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const path = new URL(request.url).pathname;
    if(path.startsWith("/arcade-runtime/mslug6/data/") || path.startsWith("/arcade-runtime/mslug6/ejs-v3/") || path.startsWith("/psp6/publish/")) return pspAssets(request,env);
    if(path.startsWith("/psp6/")) return pspSolo(request,env);
    if(path.startsWith("/api/package-bytes/") || path.startsWith("/game-packages/mslug5-v1/")) return packageBytes(request,env);
    if((path.startsWith("/api/rooms") || path === "/api/social" || path === "/api/site-session" || path === "/api/rankings" || path === "/api/lobby" || path === "/api/test-access" || path === "/api/arcade-entry" || path === "/api/game-package" || path === "/api/wallet" || path === "/api/gems") || path === "/native-config" || path === "/health") return gateway(request,env);
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
