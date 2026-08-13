import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

// CJS-compatible __dirname
const _dirname = path.dirname(require.resolve("../package.json"));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Dynamic import to avoid ESM/CJS conflicts at module load time
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteConfig = (await import("../vite.config")).default;
  const { nanoid } = await import("nanoid");

  const viteLogger = createLogger();
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg: string, options?: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(_dirname, "client", "index.html");

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(_dirname, "dist/public");

  if (!fs.existsSync(distPath)) {
    log(`Build directory not found: ${distPath}, checking for public folder`, "static");
    const publicPath = path.resolve(_dirname, "public");
    
    if (fs.existsSync(publicPath)) {
      log(`Serving static files from ${publicPath}`, "static");
      app.use(express.static(publicPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(publicPath, "index.html"));
      });
      return;
    }
    
    log(`No static files found to serve`, "static");
    app.use("*", (_req, res) => {
      res.status(500).send("Application not properly built. Please contact support.");
    });
    return;
  }

  log(`Serving static files from ${distPath}`, "static");
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
