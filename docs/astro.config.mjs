// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      head: [],
      title: 'Beat Scrobble',
      logo: {
        src: './src/assets/logo_text.png',
        replacesTitle: true,
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/SaturnX-Dev/Beat-Scrobble' }],
      sidebar: [
        {
          label: 'Guides',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Installation', slug: 'guides/installation' },
            { label: 'Importing Data', slug: 'guides/importing' },
            { label: 'Setting up the Scrobbler', slug: 'guides/scrobbler' },
            { label: 'Editing Data', slug: 'guides/editing' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Configuration Options', slug: 'reference/configuration' },
          ]
        },
      ],
      customCss: [
        // Path to your Tailwind base styles:
        './src/styles/global.css',
      ],
    }),
  ],

  site: "https://saturnx-dev.gith             ub.io",
  base: "/Beat-Scrobble",

  vite: {
    plugins: [tailwindcss()],
  },
});