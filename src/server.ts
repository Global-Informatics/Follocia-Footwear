import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

async function proxyToCommerceBackend(request: Request, url: URL): Promise<Response> {
  const candidateBackends = [
    process.env.COMMERCE_API_URL,
    process.env.BACKEND_URL,
    "http://localhost:58049",
    "http://127.0.0.1:58049",
    "http://localhost:5201",
    "http://127.0.0.1:5201",
  ].filter(Boolean) as string[];

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const bodyBuffer = hasBody ? await request.arrayBuffer() : undefined;

  for (const backend of candidateBackends) {
    try {
      const targetUrl = new URL(url.pathname + url.search, backend);
      const headers = new Headers();
      request.headers.forEach((val, key) => {
        const lower = key.toLowerCase();
        if (lower !== "host" && lower !== "content-length") {
          headers.set(key, val);
        }
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const res = await fetch(targetUrl.toString(), {
        method: request.method,
        headers,
        body: bodyBuffer,
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timeoutId);

      const resHeaders = new Headers();
      // Forward only standard response headers, excluding hop-by-hop headers
      const excludedHeaders = new Set(["transfer-encoding", "content-length", "connection", "keep-alive"]);
      res.headers.forEach((val, key) => {
        if (!excludedHeaders.has(key.toLowerCase())) {
          resHeaders.set(key, val);
        }
      });
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
      resHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");

      const resText = await res.text();
      return new Response(resText, {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
      });
    } catch {
      continue;
    }
  }

  return new Response(
    JSON.stringify({
      success: false,
      message: "Commerce backend is unreachable. Please verify that ASP.NET Core / IIS Express is running.",
    }),
    {
      status: 503,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/commerce/reverse-geocode") {
        const lat = url.searchParams.get("lat");
        const lon = url.searchParams.get("lon");
        if (lat && lon) {
          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&addressdetails=1&namedetails=1`,
              {
                headers: {
                  "User-Agent": "FolliciaLuxuryFootwear/1.0 (concierge@follicia.com; contact@follicia.in)",
                  "Accept-Language": "en-US,en;q=1.0",
                },
                signal: AbortSignal.timeout(8000),
              }
            );
            if (nomRes.ok) {
              const body = await nomRes.text();
              return new Response(body, {
                status: 200,
                headers: {
                  "content-type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              });
            }
          } catch {}
        }
      }

      if (url.pathname.startsWith("/api/commerce")) {
        return await proxyToCommerceBackend(request, url);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
