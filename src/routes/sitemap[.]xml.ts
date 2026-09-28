import { createFileRoute } from "@tanstack/react-router";

import { SERVICES, absoluteUrl } from "@/lib/site";

// Indexable pages only: /privacy is noindex, /admin and /auth are private.
const PATHS = [
  "/",
  "/about",
  "/services",
  ...SERVICES.map((s) => `/services/${s.slug}`),
  "/book",
  "/contact",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const urls = PATHS.map((path) => `  <url><loc>${absoluteUrl(path)}</loc></url>`).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
