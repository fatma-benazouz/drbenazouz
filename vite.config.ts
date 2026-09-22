// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

const STUB_ID = "\0react-pdf-server-stub";

/**
 * The PDF renderer (@react-pdf/*) is only ever used in the browser: the admin
 * dashboard is a client-only route. Bundling it into the server build inflates
 * the deployed worker past its size limit, which makes the published site fail
 * to boot. Replace it with an inert stub in the server bundle only.
 */
function stubReactPdfOnServer(): Plugin {
  return {
    name: "stub-react-pdf-on-server",
    enforce: "pre",
    resolveId(id, _importer, options) {
      if (options?.ssr && (id === "@react-pdf/renderer" || id.startsWith("@react-pdf/"))) {
        return STUB_ID;
      }
      return null;
    },
    load(id) {
      if (id !== STUB_ID) return null;
      return `
const noop = () => null;
export const StyleSheet = { create: (styles) => styles, resolve: (s) => s, flatten: (s) => s };
export const Document = noop;
export const Page = noop;
export const View = noop;
export const Text = noop;
export const Image = noop;
export const Link = noop;
export const Svg = noop;
export const Font = { register: () => {}, registerHyphenationCallback: () => {} };
export const PDFViewer = noop;
export const PDFDownloadLink = noop;
export const BlobProvider = noop;
export const usePDF = () => [{ loading: false, blob: null, url: null, error: null }, () => {}];
export const pdf = () => ({ toBlob: async () => null, toBuffer: async () => null });
export const renderToStream = async () => null;
export const renderToBuffer = async () => null;
export default { StyleSheet, Document, Page, View, Text, Image, Font, pdf, usePDF };
`;
    },
  };
}

/**
 * `queue`, used by react-pdf's browser renderer, imports Node's bare `events`
 * module. The production build otherwise replaces it with an empty browser
 * stub, which crashes New Invoice when EventEmitter runs. Applied at build
 * time only: aliasing a bare module id to project source wedges Vite's
 * dependency optimizer during dev.
 */
function queueAliasForBuild(): Plugin {
  return {
    name: "queue-alias-on-build",
    apply: "build",
    config() {
      return {
        resolve: {
          alias: {
            queue: "/src/lib/pdf-render-queue.ts",
          },
        },
      };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [stubReactPdfOnServer(), queueAliasForBuild()],
    resolve: {
      alias: {
        events: "events/",
      },
    },
  },
});
