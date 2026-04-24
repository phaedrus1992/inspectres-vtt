/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a set of docs in the sidebar
 - provide next/previous navigation

 The sidebars can be generated from the file structure automatically or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'Welcome',
    },
    {
      label: 'Getting Started',
      type: 'category',
      items: [
        'install/from-release',
        'install/from-source',
        'gameplay/getting-started',
      ],
    },
    {
      label: 'Gameplay',
      type: 'category',
      items: [
        'gameplay/mechanics',
        'gameplay/recovery',
        'gameplay/troubleshooting',
      ],
    },
    {
      label: 'Development',
      type: 'category',
      items: [
        'development/setup',
        'development/architecture',
        'development/contributing',
      ],
    },
    {
      label: 'Components',
      type: 'category',
      items: [
        'components/agent-sheet',
        'components/franchise-sheet',
        'components/rolls',
      ],
    },
    {
      type: 'doc',
      id: 'changelog',
      label: 'Changelog',
    },
  ],
};

module.exports = sidebars;
