/**
 * EDS Page configuration for visual testing.
 * SOURCE = dev environment, TARGET = production environment.
 *
 * Add or remove pages as needed. The `path` is appended to both base URLs.
 * Set `fullPage: false` to capture only the viewport for a specific page.
 * Set `waitForSelector` to pause until a key element is visible before screenshotting.
 * Set `skip: true` to temporarily exclude a page from comparison.
 */

export const SOURCE_BASE_URL = 'https://www.google.com';
export const TARGET_BASE_URL = 'https://www.amazon.in';

export interface PageConfig {
  /** Human-readable name for reports */
  name: string;
  /** URL path relative to base (must start with /) */
  path: string;
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

export const PAGES: PageConfig[] = [
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
    name: 'Contact',
    path: '/contact',
    fullPage: true,
    waitForSelector: 'main',
  },
  // Add more pages below:
  // { name: 'Blog', path: '/blog', fullPage: true },
  // { name: 'Careers', path: '/careers', fullPage: true },
];

/** Viewports used in the capture scripts (separate from Playwright projects) */
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812 },
};
