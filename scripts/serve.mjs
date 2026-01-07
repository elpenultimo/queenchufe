import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = process.env.PORT || 3000;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"]
]);

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const requestPath = decodeURIComponent(requestUrl.pathname);
    const resolvedPath = path.normalize(path.join(distRoot, requestPath));

    if (!resolvedPath.startsWith(distRoot)) {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    let filePath = resolvedPath;
    if (requestPath.endsWith("/")) {
      filePath = path.join(resolvedPath, "index.html");
    }

    let file;
    let contentType = "text/html; charset=utf-8";

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        file = await readFile(filePath);
        contentType = contentTypes.get(path.extname(filePath)) ?? contentType;
      }
    } catch {
      // fall through to SPA fallback
    }

    if (!file) {
      const fallback = path.join(distRoot, "index.html");
      file = await readFile(fallback);
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(file);
  } catch (error) {
    res.writeHead(500);
    res.end("Server Error");
  }
});

server.listen(port, () => {
  console.log(`Serving dist on http://localhost:${port}`);
});
