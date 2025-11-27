import { serveFile } from "jsr:@std/http/file-server";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/" || pathname === "") {
    return await serveFile(req, "./index.html");
  }

  // Hardcoded routes
  if (pathname === "/my-avatar.glb") {
    try {
      const data = await Deno.readFile("./my-avatar.glb");
      return new Response(data, {
        headers: { "content-type": "model/gltf-binary" },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  if (pathname === "/targets.mind") {
    try {
      const data = await Deno.readFile("./targets.mind");
      return new Response(data, {
        headers: { "content-type": "application/mind" },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  // Fallback: try to serve other files via std serveFile
  try {
    // simple path traversal guard
    if (pathname.includes(".."))
      return new Response("Forbidden", { status: 403 });
    return await serveFile(req, "." + pathname);
  } catch {
    return new Response("Not found", { status: 404 });
  }
});
