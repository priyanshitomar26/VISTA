#!/usr/bin/env node
/**
 * capture-screenshots.js
 *
 * Standalone Node.js script (no test runner) that uses Playwright directly
 * to capture full-page screenshots of all configured pages.
 *
 * Usage:
 *   node scripts/capture-screenshots.js source   # capture only SOURCE env
 *   node scripts/capture-screenshots.js target   # capture only TARGET env
 *   node scripts/capture-screenshots.js all      # capture both (default)
 */

// @ts-check
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Inline config so this script has no TS dependency at runtime
const { PAGES } = require('../config/pages.config.js');

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile',  width: 375,  height: 812 },
];

const mode = process.argv[2] || 'all';
const SCREENSHOT_DIR = path.resolve('screenshots');

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    for (const pageConfig of PAGES) {
      if (pageConfig.skip) continue;

      const slug = slugify(pageConfig.name);
      const dir = path.join(SCREENSHOT_DIR, viewport.label, slug);
      fs.mkdirSync(dir, { recursive: true });

      if (mode === 'source' || mode === 'all') {
        console.log(`[SOURCE][${viewport.label}] ${pageConfig.name} → ${pageConfig.sourceUrl}`);
        await captureScreenshot(page, pageConfig.sourceUrl, pageConfig, path.join(dir, 'source.png'));
      }

      if (mode === 'target' || mode === 'all') {
        console.log(`[TARGET][${viewport.label}] ${pageConfig.name} → ${pageConfig.targetUrl}`);
        await captureScreenshot(page, pageConfig.targetUrl, pageConfig, path.join(dir, 'target.png'));
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('\nScreenshots saved to: ' + SCREENSHOT_DIR);
})();

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 * @param {{ waitForSelector?: string, waitMs?: number, fullPage?: boolean }} config
 * @param {string} outputPath
 */
async function captureScreenshot(page, url, config, outputPath) {
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await new Promise(r => setTimeout(r, 2000));

  if (config.waitForSelector) {
    await page.waitForSelector(config.waitForSelector, { timeout: 30_000 }).catch(() => {});
  }

  // Disable animations
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });

  // Trigger lazy loading
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const timer = setInterval(() => {
        window.scrollBy(0, 300);
        if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve(undefined);
        }
      }, 80);
    });
  });

  await new Promise(r => setTimeout(r, config.waitMs ?? 500));

  await page.screenshot({
    path: outputPath,
    fullPage: config.fullPage !== false,
    animations: 'disabled',
  });
}

/** @param {string} text */
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
