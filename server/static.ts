import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { injectArticleOgTags } from "./og-injector";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", async (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    const url = req.originalUrl;

    if (url.startsWith("/the-sandbox/") && url !== "/the-sandbox/") {
      try {
        let html = await fs.promises.readFile(indexPath, "utf-8");
        html = await injectArticleOgTags(html, url);
        return res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (error) {
        console.error("[static] Error injecting OG tags:", error);
      }
    }

    res.sendFile(indexPath);
  });
}
