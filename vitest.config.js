// Astro's own Vite config, so the tests resolve modules the way the site does:
// src/lib/data.js reads the database through import.meta.glob('/data/*.json'),
// which plain node cannot do.
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
