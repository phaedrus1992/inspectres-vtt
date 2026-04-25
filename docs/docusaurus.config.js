// @ts-check
// `@type` JSDoc annotations allow better IDE autocompletion and type checking
// @type {import('@docusaurus/types').Config}

// Note: This uses CommonJS syntax (not ESM) because Docusaurus 3.10's webpack SSR build
// cannot support "type": "module" in package.json. Webpack internally requires
// CommonJS for server-side rendering and does not provide require.resolveWeak in ESM mode.
const config = {
  title: 'InSpectres VTT',
  tagline: 'Paranormal investigation RPG system for Foundry VTT',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://phaedrus1992.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/inspectres-vtt/',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  organizationName: 'phaedrus1992',
  projectName: 'inspectres-vtt',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  onBrokenLinks: 'throw',

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'current',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/phaedrus1992/inspectres-vtt/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'InSpectres VTT',
        logo: {
          alt: 'InSpectres VTT Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            href: 'https://github.com/phaedrus1992/inspectres-vtt',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/',
              },
              {
                label: 'Installation',
                to: '/install/from-release',
              },
              {
                label: 'Development',
                to: '/development/setup',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub Issues',
                href: 'https://github.com/phaedrus1992/inspectres-vtt/issues',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/phaedrus1992/inspectres-vtt',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} InSpectres VTT. Built with Docusaurus.`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
      },
    }),
};

module.exports = config;
