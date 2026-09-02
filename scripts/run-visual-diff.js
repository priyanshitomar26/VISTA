#!/usr/bin/env node
/**
 * run-visual-diff.js
 *
 * All-in-one script: capture → diff → open report.
 * Usage:  node scripts/run-visual-diff.js
 *         node scripts/run-visual-diff.js desktop     (desktop viewport only)
 *         node scripts/run-visual-diff.js mobile      (mobile viewport only)
 */

// @ts-check
const { chromium } = require('@playwright/test');
const { PNG }      = require('pngjs');
const pixelmatch   = require('pixelmatch');
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');
const { buildReport } = require('./report-builder');

const { PAGES } = require('../config/pages.config.js');

const SCREENSHOT_DIR = path.resolve('screenshots');
const REPORT_DIR     = path.resolve('diff-report');
const THRESHOLD      = 0.1;

/** slug → page config, so each card can show its own URL pair */
const PAGE_BY_SLUG = new Map(PAGES.map((p) => [slugify(p.name), p]));

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900  },
  { label: 'mobile',  width: 375,  height: 812  },
];

const viewportFilter = process.argv[2]; // optional: 'desktop' | 'mobile'
const activeViewports = viewportFilter
  ? VIEWPORTS.filter(v => v.label === viewportFilter)
  : VIEWPORTS;

(async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' EDS Visual Diff — capture + compare');
  for (const p of PAGES.filter((p) => !p.skip)) {
    console.log(`  ${p.name}: ${p.sourceUrl}  vs  ${p.targetUrl}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Step 1: Capture ──────────────────────────────────────────────────────
  const browser = await chromium.launch({ headless: true });

  for (const vp of activeViewports) {
    const ctx  = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();

    for (const pageConfig of PAGES) {
      if (pageConfig.skip) continue;

      const slug = slugify(pageConfig.name);
      const dir  = path.join(SCREENSHOT_DIR, vp.label, slug);
      fs.mkdirSync(dir, { recursive: true });

      for (const [env, url] of [['source', pageConfig.sourceUrl], ['target', pageConfig.targetUrl]]) {
        const dest = path.join(dir, `${env}.png`);
        process.stdout.write(`  [${env.toUpperCase()}][${vp.label}] ${pageConfig.name} … `);
        await capture(page, url, pageConfig, dest);
        console.log('done');
      }
    }

    await ctx.close();
  }

  await browser.close();

  // ── Step 2: Diff + build report ──────────────────────────────────────────
  console.log('\n  Building diff report …');
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  /** @type {Array<object>} */
  const results = [];

  const vpDirs = fs.readdirSync(SCREENSHOT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name);

  for (const vp of vpDirs) {
    const pageDirs = fs.readdirSync(path.join(SCREENSHOT_DIR, vp), { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);

    for (const slug of pageDirs) {
      if (!PAGE_BY_SLUG.has(slug)) continue;

      const dir        = path.join(SCREENSHOT_DIR, vp, slug);
      const sourcePath = path.join(dir, 'source.png');
      const targetPath = path.join(dir, 'target.png');
      const diffPath   = path.join(dir, 'diff.png');

      if (!fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) continue;

      const sImg = PNG.sync.read(fs.readFileSync(sourcePath));
      const tImg = PNG.sync.read(fs.readFileSync(targetPath));
      const w    = Math.max(sImg.width, tImg.width);
      const h    = Math.max(sImg.height, tImg.height);
      const diff = new PNG({ width: w, height: h });

      const diffPx = pixelmatch(
        padImage(sImg, w, h).data,
        padImage(tImg, w, h).data,
        diff.data, w, h,
        { threshold: THRESHOLD, includeAA: false },
      );

      fs.writeFileSync(diffPath, PNG.sync.write(diff));

      const total  = w * h;
      const pct    = (diffPx / total) * 100;
      const status = pct < 0.5 ? 'PASS' : 'FAIL';
      console.log(`  [${status}] ${vp}/${slug} — ${pct.toFixed(2)}% diff`);

      results.push({
        page: slug, viewport: vp,
        diffPixels: diffPx, totalPixels: total, diffPct: pct,
        sourceUrl: PAGE_BY_SLUG.get(slug)?.sourceUrl,
        targetUrl: PAGE_BY_SLUG.get(slug)?.targetUrl,
        sourceSrc: toDataURL(sourcePath),
        targetSrc: toDataURL(targetPath),
        diffSrc:   toDataURL(diffPath),
      });
    }
  }

  const reportPath = buildReport(results, REPORT_DIR);
  console.log(`\n  Report saved → ${reportPath}`);

  // ── Step 3: Open browser ─────────────────────────────────────────────────
  console.log('  Opening report in browser …\n');
  try {
    execSync(`start "" "${reportPath}"`, { stdio: 'ignore', shell: true });
  } catch {
    console.log(`  Open manually: ${reportPath}`);
  }
})();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function capture(page, url, config, outputPath) {
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  // Extra settle time for heavy SPAs / ad-heavy pages
  await page.waitForTimeout(2000);

  if (config.waitForSelector) {
    await page.waitForSelector(config.waitForSelector, { timeout: 15_000 }).catch(() => {});
  }

  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });

  // Scroll to trigger lazy-loaded images then return to top
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const t = setInterval(() => {
        window.scrollBy(0, 400);
        if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
          clearInterval(t);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 80);
    });
  });

  await page.waitForTimeout(config.waitMs ?? 600);
  await page.screenshot({ path: outputPath, fullPage: config.fullPage !== false, animations: 'disabled' });
}

function padImage(img, w, h) {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

function toDataURL(p) {
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

