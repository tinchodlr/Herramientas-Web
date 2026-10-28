// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// Cuando haya dominio, definir SITE_URL (ej: SITE_URL=https://midominio.com npm run build)
// para que el sitemap, las URLs canónicas y los hreflang salgan con el dominio real.
// En Netlify, la variable URL ya trae la dirección principal del sitio (la .netlify.app o el dominio propio).
const site = process.env.SITE_URL || process.env.URL || 'http://localhost:4321';

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [preact(), sitemap()],
});
