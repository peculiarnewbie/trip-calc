import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import { HttpRouter } from "effect/unstable/http";
import { ApiRoutes, EnvService } from "./server/routes";
import type { Env } from "./server/env";

export type { Env };

const appLayer = Layer.merge(HttpRouter.layer, ApiRoutes);

const { handler } = HttpRouter.toWebHandler(appLayer);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return await handler(request, Context.make(EnvService, env));
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404) {
      return env.ASSETS.fetch(new Request(new URL("/index.html", url.origin)));
    }
    return assetResponse;
  },
} satisfies ExportedHandler<Env>;
