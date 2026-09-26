// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://blackfreedomstudies.org',
  trailingSlash: 'ignore',
  // Keep editor-only pages (e.g. /admin/image-audit/) out of the sitemap
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') })],
});
