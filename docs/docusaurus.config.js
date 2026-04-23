// @ts-check
// `@type` JSDoc annotations allow better IDE autocompletion and type checking
// @type {import('@docusaurus/types').Config}

// Note: This uses CommonJS syntax (not ESM) because Docusaurus 3.10's webpack SSR build
// cannot support "type": "module" in package.json. Webpack internally requires
// CommonJS for server-side rendering and does not provide require.resolveWeak in ESM mode.
const config = {
  title: 'InSpectres',
  tagline: 'Paranormal investigation RPG system for Foundry VTT',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://phaedrus1992.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/inspectres-vtt/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'phaedrus1992', // Usually your GitHub org/username.
  projectName: 'inspectres-vtt', // Usually your repo name.
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

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
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'InSpectres',
        logo: {
          alt: 'InSpectres Logo',
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
        copyright: `Copyright © ${new Date().getFullYear()} InSpectres. Built with Docusaurus.`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
      },
    }),
};

module.exports = config;
