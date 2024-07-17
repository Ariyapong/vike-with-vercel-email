import { renderPage } from "vike/server";
import express from "express";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const hmrPort = process.env.HMR_PORT
  ? parseInt(process.env.HMR_PORT, 10)
  : 24678;

// We use JSDoc instead of TypeScript because Vercel seems buggy with /api/**/*.ts files

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.use(express.static(`${root}/dist/client`));
  } else {
    // Instantiate Vite's development server and integrate its middleware to our server.
    // ⚠️ We should instantiate it *only* in development. (It isn't needed in production
    // and would unnecessarily bloat our server in production.)
    const vite = await import("vite");
    const viteDevMiddleware = (
      await vite.createServer({
        root,
        server: { middlewareMode: true, hmr: { port: hmrPort } },
      })
    ).middlewares;
    app.use(viteDevMiddleware);
  }

  app.get("/api/hello", (req, res) => {
    res.json({ message: "Hello from the server!" });
  })

  app.get("*", async (req, res) => {
    const { url } = req;
    console.log("Request to url:", url);
    if (url === undefined) throw new Error("req.url is undefined");

    const pageContextInit = { urlOriginal: url };
    const pageContext = await renderPage(pageContextInit);
    const { httpResponse } = pageContext;
    console.log("httpResponse", !!httpResponse);

    if (!httpResponse) {
      res.statusCode = 200;
      res.end();
      return;
    }

    const { body, statusCode, headers } = httpResponse;
    res.statusCode = statusCode;
    headers.forEach(([name, value]) => res.setHeader(name, value));
    res.end(body);
  });

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });

  return app;
}
