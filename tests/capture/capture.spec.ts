import { test, expect } from '@playwright/test';
import path from 'path';
import {
  PAGES,
  SOURCE_BASE_URL,
  TARGET_BASE_URL,
} from '../../config/pages.config';
import { navigateAndWait, buildMasks, slugify } from '../../utils/page-helpers';

/**
 * Side-by-side screenshot capture tests.
 * These tests DO NOT assert visual equality — they simply capture and save
 * screenshots of both environments into the `screenshots/` folder so the
 * diff-report script can compare them visually.
 *
 * Run with:  npx playwright test tests/capture/capture.spec.ts
 */

const SCREENSHOT_DIR = path.resolve('screenshots');

for (const pageConfig of PAGES) {
  if (pageConfig.skip) continue;

  test.describe(`Capture: ${pageConfig.name}`, () => {
    test(`Capture SOURCE — ${pageConfig.name}`, async ({ page, browserName }, testInfo) => {
      const slug = slugify(pageConfig.name);
      const dir = path.join(SCREENSHOT_DIR, browserName, slug);
      await page.context().browser()?.newPage();

      await navigateAndWait(page, `${SOURCE_BASE_URL}${pageConfig.path}`, pageConfig);
      const masks = buildMasks(page, pageConfig.maskSelectors);

      const screenshotPath = path.join(dir, 'source.png');
      await page.screenshot({
        path: screenshotPath,
        fullPage: pageConfig.fullPage ?? true,
        animations: 'disabled',
        mask: masks,
      });

      testInfo.attachments.push({
        name: `source-${slug}`,
        contentType: 'image/png',
        path: screenshotPath,
      });
    });

    test(`Capture TARGET — ${pageConfig.name}`, async ({ page, browserName }, testInfo) => {
      const slug = slugify(pageConfig.name);
      const dir = path.join(SCREENSHOT_DIR, browserName, slug);

      await navigateAndWait(page, `${TARGET_BASE_URL}${pageConfig.path}`, pageConfig);
      const masks = buildMasks(page, pageConfig.maskSelectors);

      const screenshotPath = path.join(dir, 'target.png');
      await page.screenshot({
        path: screenshotPath,
        fullPage: pageConfig.fullPage ?? true,
        animations: 'disabled',
        mask: masks,
      });

      testInfo.attachments.push({
        name: `target-${slug}`,
        contentType: 'image/png',
        path: screenshotPath,
      });
    });
  });
}
