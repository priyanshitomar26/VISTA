/**
 * CommonJS mirror of config/pages.config.ts — used by plain Node.js scripts.
 * Keep in sync with config/pages.config.ts.
 */

const SOURCE_BASE_URL = 'https://www.google.com';
const TARGET_BASE_URL = 'https://www.amazon.in';

/** @type {Array<import('./pages.config').PageConfig>} */
const PAGES = [
  {
    name: 'Home',
    path: '/',
    fullPage: true,
    waitForSelector: 'body',
    maskSelectors: [],
  },
  {
    name: 'About Us',
    path: '/about-us',
    fullPage: true,
    waitForSelector: 'main',
  },
  {
    name: 'Products',
    path: '/products',
    fullPage: true,
    waitForSelector: 'main',
  },
  {
    name: 'Solutions',
    path: '/solutions',
    fullPage: true,
    waitForSelector: 'main',
  },
  {
    name: 'Contact',
    path: '/contact',
    fullPage: true,
    waitForSelector: 'main',
  },
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812 },
};

module.exports = { SOURCE_BASE_URL, TARGET_BASE_URL, PAGES, VIEWPORTS };
