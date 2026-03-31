import { type Express } from "express";
import { createServer as createViteServer, createLogger, type UserConfig } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "aibizbot-dev.gatewayglobal.ai",
      "www.gatewayglobal.ai",
      "gatewayglobal.ai",
    ],
  };

  // Resolve async config so root, plugins, etc. are applied (spreading the raw export would miss them)
  const resolvedConfig =
    typeof viteConfig === "function"
      ? await (viteConfig as (env: { mode: string; command?: string }) => Promise<object>)({
          mode: "development",
          command: "serve",
        })
      : viteConfig;

  const base = resolvedConfig as UserConfig;
  // Must merge server options: replacing `server` entirely drops `fs.allow` from vite.config.ts.
  // With root=client and fs.strict, omitting allow breaks resolution of `@gateway/canvas-sdk`
  // (packages/ outside client/) and other monorepo aliases.
  const vite = await createViteServer({
    ...base,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: {
      ...(base.server ?? {}),
      ...serverOptions,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;
    const p = req.path;
    // Never serve HTML for source or asset paths — let Vite (or next) handle them
    if (p.startsWith("/src/") || p.startsWith("/@") || p.startsWith("/node_modules/") || /\.[a-zA-Z0-9]+$/.test(p)) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
