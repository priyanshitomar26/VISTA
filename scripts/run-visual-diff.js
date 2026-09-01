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

const { SOURCE_BASE_URL, TARGET_BASE_URL, PAGES } = require('../config/pages.config.js');

const SCREENSHOT_DIR = path.resolve('screenshots');
const REPORT_DIR     = path.resolve('diff-report');
const THRESHOLD      = 0.1;

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
  console.log(`  SOURCE : ${SOURCE_BASE_URL}`);
  console.log(`  TARGET : ${TARGET_BASE_URL}`);
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

      for (const [env, baseUrl] of [['source', SOURCE_BASE_URL], ['target', TARGET_BASE_URL]]) {
        const url  = baseUrl + pageConfig.path;
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
        sourceSrc: toDataURL(sourcePath),
        targetSrc: toDataURL(targetPath),
        diffSrc:   toDataURL(diffPath),
      });
    }
  }

  const reportPath = path.join(REPORT_DIR, 'index.html');
  fs.writeFileSync(reportPath, buildHTML(results));
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

function buildHTML(results) {
  const pass = results.filter(r => r.diffPct < 0.5).length;
  const fail = results.length - pass;
  const date = new Date().toLocaleString();

  const cards = results.map(r => {
    const cls = r.diffPct < 0.5 ? 'pass' : 'fail';
    return `
    <section class="card ${cls}">
      <div class="card-header">
        <span class="badge ${cls}">${cls.toUpperCase()}</span>
        <h2>${r.viewport} / ${r.page}</h2>
        <span class="meta">${r.diffPct.toFixed(3)}% diff &nbsp;(${r.diffPixels.toLocaleString()} / ${r.totalPixels.toLocaleString()} px)</span>
      </div>
      <div class="images">
        <figure><figcaption>SOURCE</figcaption><img src="${r.sourceSrc}" loading="lazy"></figure>
        <figure><figcaption>TARGET</figcaption><img src="${r.targetSrc}" loading="lazy"></figure>
        <figure><figcaption>DIFF</figcaption><img src="${r.diffSrc}" loading="lazy"></figure>
      </div>
    </section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Visual Diff Report</title>
<style>
:root{--pass:#22c55e;--fail:#ef4444;--bg:#0f172a;--surf:#1e293b;--txt:#e2e8f0}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--txt);font-family:system-ui,sans-serif;padding:2rem}
header{margin-bottom:1.5rem}
header h1{font-size:1.8rem;margin-bottom:.4rem}
header p{color:#94a3b8;font-size:.9rem}
.summary{display:flex;gap:1rem;margin-bottom:2rem}
.stat{background:var(--surf);border-radius:8px;padding:.9rem 1.4rem}
.stat span{display:block;font-size:2rem;font-weight:700}
.stat label{font-size:.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
.pass-s span{color:var(--pass)}.fail-s span{color:var(--fail)}
.card{background:var(--surf);border-radius:10px;margin-bottom:2rem;border-left:4px solid var(--pass)}
.card.fail{border-left-color:var(--fail)}
.card-header{display:flex;align-items:center;gap:1rem;padding:1rem 1.5rem}
.card-header h2{font-size:1rem;flex:1}
.meta{font-size:.82rem;color:#94a3b8}
.badge{padding:.2rem .6rem;border-radius:4px;font-size:.72rem;font-weight:700;background:var(--pass);color:#fff}
.badge.fail{background:var(--fail)}
.images{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#0f172a}
figure{background:var(--surf);padding:.75rem}
figcaption{font-size:.7rem;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem}
img{width:100%;height:auto;border-radius:4px;cursor:zoom-in;display:block}
img.zoomed{position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;
  background:rgba(0,0,0,.92);z-index:9999;cursor:zoom-out;border-radius:0}
footer{margin-top:3rem;color:#475569;font-size:.78rem;text-align:center}
</style>
</head>
<body>
<header>
  <h1>Visual Diff Report</h1>
  <p>SOURCE: <strong>${SOURCE_BASE_URL}</strong> &nbsp;→&nbsp; TARGET: <strong>${TARGET_BASE_URL}</strong></p>
  <p>Generated: ${date}</p>
</header>
<div class="summary">
  <div class="stat pass-s"><span>${pass}</span><label>Passed</label></div>
  <div class="stat fail-s"><span>${fail}</span><label>Failed</label></div>
  <div class="stat"><span>${results.length}</span><label>Total</label></div>
</div>
${cards}
<footer>Pixel tolerance: ${(THRESHOLD*100).toFixed(0)}% per pixel &nbsp;|&nbsp; Fail threshold: ≥ 0.5% changed pixels</footer>
<script>
  document.querySelectorAll('.images img').forEach(img =>
    img.addEventListener('click', () => img.classList.toggle('zoomed'))
  );
</script>
</body>
</html>`;
}
