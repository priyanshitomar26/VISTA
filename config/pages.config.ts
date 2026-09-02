/**
 * EDS Page configuration for visual testing.
 * SOURCE = dev environment, TARGET = production environment.
 *
 * Every row of config/pages.xlsx (sheet "Pages") is one comparison:
 *   S No. | SOURCE_BASE_URL | TARGET_BASE_URL | Page Name
 * Optional columns: path, fullPage, waitForSelector, waitMs, skip, maskSelectors
 *
 * Edit the workbook to add/update URLs — no code changes needed.
 * Run `npm run config:init` to create the workbook if it is missing.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadConfig } = require('./excel-loader.js');

export interface PageConfig {
  /** Human-readable name for reports ("Page Name" column) */
  name: string;
  /** Full URL of the page on the SOURCE environment */
  sourceUrl: string;
  /** Full URL of the page on the TARGET environment */
  targetUrl: string;
  /** Capture entire scrollable page — defaults to true */
  fullPage?: boolean;
  /** CSS selector to wait for before screenshotting */
  waitForSelector?: string;
  /** Extra wait time in ms after page load */
  waitMs?: number;
  /** Skip this page */
  skip?: boolean;
  /** CSS selectors of dynamic elements to mask */
  maskSelectors?: string[];
}

interface ExcelConfig {
  SOURCE_BASE_URL: string;
  TARGET_BASE_URL: string;
  PAGES: PageConfig[];
}

const config: ExcelConfig = loadConfig();

/** First SOURCE URL in the workbook — used for report headers only */
export const SOURCE_BASE_URL: string = config.SOURCE_BASE_URL;
/** First TARGET URL in the workbook — used for report headers only */
export const TARGET_BASE_URL: string = config.TARGET_BASE_URL;
export const PAGES: PageConfig[] = config.PAGES;

/** Viewports used in the capture scripts (separate from Playwright projects) */
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812 },
};
