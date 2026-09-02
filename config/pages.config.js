/**
 * CommonJS config entry — used by plain Node.js scripts.
 * Base URLs and the page list live in config/pages.xlsx; edit the workbook,
 * not this file. Run `npm run config:init` if the workbook is missing.
 */

// @ts-check
const { loadConfig } = require('./excel-loader.js');

const { SOURCE_BASE_URL, TARGET_BASE_URL, PAGES } = loadConfig();

/** Viewports used in the capture scripts (separate from Playwright projects) */
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812 },
};

module.exports = { SOURCE_BASE_URL, TARGET_BASE_URL, PAGES, VIEWPORTS };
