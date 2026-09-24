// @ts-nocheck

const fs = require('fs');
const path = require('path');

const CSS_SRC = path.resolve(__dirname, '../report-assets/styles.css');

/**
 * @param {any} data Playwright JSON reporter output
 * @param {string} outDir
 * @param {Record<string, PageMetadata>} metadata
 */
function buildSanityReport(data, outDir, metadata = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(CSS_SRC, path.join(outDir, 'styles.css'));

  const checks = flattenSpecs(data.suites ?? []);
  const passed = checks.filter((check) => check.status === 'passed').length;
  const failed = checks.length - passed;
  const html = buildHtml(checks, passed, failed, metadata);
  const htmlPath = path.join(outDir, 'index.html');
  fs.writeFileSync(htmlPath, html);
  return htmlPath;
}

/** @typedef {{ title: string, status: 'passed'|'failed', duration: number, error: string, url: string }} Check */
/** @typedef {{ url: string, name: string, checks: Check[], metadata: PageMetadata }} Page */
/** @typedef {{ title: string, description: string, speed: number, statusCode: number, error?: string }} PageMetadata */

/** @param {any[]} suites @returns {Check[]} */
function flattenSpecs(suites) {
  const checks = [];
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      const test = spec.tests?.[0];
      const result = test?.results?.[test.results.length - 1];
      const title = [...(suite.title ? [suite.title] : []), spec.title].join(' › ');
      checks.push({
        title,
        status: test?.status === 'expected' ? 'passed' : 'failed',
        duration: result?.duration ?? 0,
        error: result?.error?.message ?? result?.errors?.[0]?.message ?? '',
        url: extractUrl(title),
      });
    }
    checks.push(...flattenSpecs(suite.suites ?? []));
  }
  return checks;
}

/** @param {string} title */
function extractUrl(title) {
  const match = title.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : '';
}

/** @param {string} value */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character] ?? character));
}

/** @param {string} title */
function checkLabel(title) {
  const value = title.toLowerCase();
  if (value.includes('page loads')) return 'Website Load Successfully';
  if (value.includes('header is visible')) return 'Header Visible';
  if (value.includes('footer is visible')) return 'Footer Visible';
  if (value.includes('logo links')) return 'Logo is Clickable';
  if (value.includes('console errors')) return 'Any Critical console Errors';
  if (value.includes('search works')) return 'Search is working';
  if (value.includes('open graph metadata')) return 'Open Graph Metadata';
  return (title.split(' › ').pop() ?? title).replace(/\s+—\s+https?:\/\/[^\s]+$/, '');
}

/** @param {string} url */
function pageNameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '');
    if (!pathname) return 'Home';
    const lastSegment = decodeURIComponent(pathname.split('/').pop() || 'page');
    return lastSegment.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return 'Page';
  }
}

/** @param {ReturnType<typeof flattenSpecs>} checks @param {number} passed @param {number} failed @param {Record<string, PageMetadata>} metadata */
function buildHtml(checks, passed, failed, metadata) {
  const date = new Date().toLocaleString();
  const groups = [...new Set(checks.map((check) => check.url || 'Unspecified URL'))];
  const pages = groups.map((url) => ({
    url,
    name: pageNameFromUrl(url),
    checks: checks.filter((check) => check.url === url),
    metadata: metadata[url] ?? { title: '', description: '', speed: 0, statusCode: 0 },
  }));
  const navItems = pages.map((page, index) => `
    <li data-label="${escapeHtml(`${page.name} ${page.url}`.toLowerCase())}">
      <a href="#page-${index}"><span class="dot ${page.checks.every((check) => check.status === 'passed') ? 'pass' : 'fail'}"></span><strong>${escapeHtml(page.name)}</strong><br><span>${escapeHtml(page.url)}</span></a>
    </li>`).join('');

  const cards = pages.map((page, pageIndex) => {
    const failedChecks = page.checks.filter((check) => check.status !== 'passed').length;
    const overallPassed = failedChecks === 0;
    const percentage = page.checks.length ? Math.round(((page.checks.length - failedChecks) / page.checks.length) * 100) : 0;
    const statusClass = overallPassed ? 'pass' : 'fail';
    const checkRows = page.checks.map((check) => `<div class="sanity-row"><span>${escapeHtml(checkLabel(check.title))}</span><strong class="${check.status === 'passed' ? 'check-pass' : 'check-fail'}">${check.status === 'passed' ? 'Pass' : 'Fail'}</strong>${check.error ? `<pre>${escapeHtml(check.error)}</pre>` : ''}</div>`).join('');
    return `<section class="card sanity-page ${statusClass}" id="page-${pageIndex}">
      <button class="page-summary" type="button" aria-expanded="false" aria-controls="page-details-${pageIndex}">
        <span><strong>Page Name :</strong> ${escapeHtml(page.name)}</span>
        <span><strong>Page URL :</strong> ${escapeHtml(page.url)}</span>
        <span class="summary-chevron">+</span>
      </button>
      <div class="page-details" id="page-details-${pageIndex}" hidden>
        <div class="sanity-grid">
          <div class="sanity-row"><span>Page Title :</span><strong>${escapeHtml(page.metadata.title || 'Not available')}</strong></div>
          <div class="sanity-row"><span>Page Description :</span><strong>${escapeHtml(page.metadata.description || 'Not available')}</strong></div>
          <div class="sanity-row"><span>Page Speed :</span><strong>${page.metadata.speed ? `${page.metadata.speed} ms` : 'Not available'}</strong></div>
          <div class="sanity-row"><span>Page URL :</span><a href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(page.url)}</a></div>
          ${checkRows}
          <div class="sanity-row"><span>Status Code of Page :</span><strong>${page.metadata.statusCode || 'Not available'}</strong></div>
          <div class="sanity-row"><span>Overall Page Status (Pass/Fail) :</span><strong class="check-${statusClass}">${overallPassed ? 'Pass' : 'Fail'}</strong></div>
          <div class="sanity-row"><span>Overall Percentage for the Page Check :</span><strong class="check-${statusClass}">${percentage}%</strong></div>
        </div>
      </div>
    </section>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Sanity Test Report</title><link rel="stylesheet" href="styles.css"><style>
    .sanity-details { display:grid; grid-template-columns:auto 1fr; gap:.65rem 1rem; padding:1rem 1.4rem; color:var(--muted); font-size:.86rem; }
    .sanity-details a { color:var(--txt); word-break:break-all; }
    .sanity-details pre { grid-column:1 / -1; white-space:pre-wrap; color:#fecaca; background:#351b25; border:1px solid #7f1d1d; border-radius:6px; padding:.8rem; font:inherit; }
    .check-ok { color:var(--pass); }
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    #nav-list > li { list-style:none; margin-bottom:.35rem; }
    #nav-list > li > a { display:block; line-height:1.35; }
    #nav-list > li > a span { color:var(--muted); font-size:.72rem; word-break:break-all; }
  </style></head><body><div class="main-content"><header><h1>Sanity Test Report</h1><p>Generated: ${escapeHtml(date)}</p></header><div class="summary"><div class="stat pass-s"><span>${passed}</span><span>Passed Checks</span></div><div class="stat fail-s"><span>${failed}</span><span>Failed Checks</span></div><div class="stat"><span>${pages.length}</span><span>Pages</span></div></div>${cards}<footer>Live URL sanity checks</footer></div><aside class="sidebar"><div class="search-wrap"><label class="sr-only" for="search">Search page URL or name</label><input id="search" type="search" placeholder="Search page URL or name…" autocomplete="off"></div><ul id="nav-list">${navItems}</ul><p id="no-results">No pages match.</p></aside><script>
    const input=document.getElementById('search'); const items=document.querySelectorAll('#nav-list li[data-label]');
    input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();let visible=0;items.forEach(item=>{const match=!q||item.dataset.label.includes(q);item.classList.toggle('hidden',!match);visible+=match?1:0;});document.getElementById('no-results').style.display=visible?'none':'block';});
    document.querySelectorAll('.page-summary').forEach(button=>button.addEventListener('click',()=>{const details=document.getElementById(button.getAttribute('aria-controls'));const open=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!open));details.hidden=open;button.querySelector('.summary-chevron').textContent=open?'+':'−';}));
    document.querySelectorAll('.sanity-page').forEach(card=>{const link=document.querySelector('a[href="#'+card.id+'"]');if(link) new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){document.querySelectorAll('#nav-list a.active').forEach(a=>a.classList.remove('active'));link.classList.add('active');}}),{threshold:.25}).observe(card);});
  </script></body></html>`;
}

module.exports = { buildSanityReport };