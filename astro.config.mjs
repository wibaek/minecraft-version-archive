import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://minecraft-version-archive.pages.dev",
  output: "static",
  integrations: [sitemap()],
  server: {
    port: 3162,
  },
});
