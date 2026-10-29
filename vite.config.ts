import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { parse } from "cookie";
import type { ApiHandler, ApiRequest, ApiResponse } from "./api/_lib/vercel";
import authHandler from "./api/auth/[action]";
import supabaseHandler from "./api/supabase/[...path]";

function localApiFunctions(): Plugin {
  const handlers: Record<string, ApiHandler> = {
    auth: authHandler,
    supabase: supabaseHandler,
  };

  return {
    name: "local-api-functions",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const route = requestUrl.pathname.startsWith("/api/auth/")
          ? "auth"
          : requestUrl.pathname.startsWith("/api/supabase/")
            ? "supabase"
            : null;
        if (!route) {
          next();
          return;
        }

        const query: Record<string, string | string[]> = {};
        for (const [key, value] of requestUrl.searchParams) {
          const current = query[key];
          query[key] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value];
        }
        if (route === "auth") {
          query.action = requestUrl.pathname.slice("/api/auth/".length);
        }

        let body: unknown;
        if (req.method !== "GET" && req.method !== "HEAD") {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.from(chunk));
          const rawBody = Buffer.concat(chunks).toString("utf8");
          if (rawBody) {
            try {
              body = req.headers["content-type"]?.includes("application/json")
                ? JSON.parse(rawBody)
                : rawBody;
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Invalid request body" }));
              return;
            }
          }
        }

        const request = Object.assign(req, {
          query,
          cookies: parse(req.headers.cookie ?? ""),
          body,
        }) as ApiRequest;
        const response = res as ApiResponse;
        response.status = (statusCode) => {
          res.statusCode = statusCode;
          return response;
        };
        response.json = (jsonBody) => {
          if (!res.headersSent) res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(jsonBody));
          return response;
        };
        response.send = (responseBody) => {
          res.end(responseBody);
          return response;
        };

        try {
          await handlers[route](request, response);
        } catch (error) {
          console.error(`[local-api/${route}] Handler failed`, error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "Local API request failed" }));
          }
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.SUPABASE_URL ??= env.SUPABASE_URL;
  process.env.SUPABASE_PUBLISHABLE_KEY ??= env.SUPABASE_PUBLISHABLE_KEY;

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [localApiFunctions(), react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
