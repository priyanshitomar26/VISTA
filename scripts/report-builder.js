// @ts-check
/**
 * Shared HTML report builder.
 * Writes styles.css alongside index.html in the output directory.
 */
const fs   = require('fs');
const path = require('path');

const CSS_SRC = path.resolve(__dirname, '../report-assets/styles.css');

/**
 * @param {Array<{page:string,viewport:string,diffPixels:number,totalPixels:number,
 *   diffPct:number,sourceSrc:string,targetSrc:string,diffSrc:string}>} results
 * @param {string} sourceUrl
 * @param {string} targetUrl
 * @param {string} outDir  directory to write index.html + styles.css into
 */
function buildReport(results, sourceUrl, targetUrl, outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  // Copy CSS next to the HTML so the <link> works when opened as a local file
  fs.copyFileSync(CSS_SRC, path.join(outDir, 'styles.css'));

  const html = buildHTML(results, sourceUrl, targetUrl);
  const htmlPath = path.join(outDir, 'index.html');
  fs.writeFileSync(htmlPath, html);
  return htmlPath;
}

/**
 * @param {Array<object>} results
 * @param {string} sourceUrl
 * @param {string} targetUrl
 * @returns {string}
 */
function buildHTML(results, sourceUrl, targetUrl) {
  const pass = results.filter(r => r.diffPct < 0.5).length;
  const fail = results.length - pass;
  const date = new Date().toLocaleString();

  // Group results by viewport then build grouped nav
  const byViewport = {};
  results.forEach(r => {
    if (!byViewport[r.viewport]) byViewport[r.viewport] = [];
    byViewport[r.viewport].push(r);
  });

  const navItems = Object.entries(byViewport).map(([vp, items]) => {
    const vpId = `group-${vp}`;
    const pageLinks = items.map(r => {
      const cls = r.diffPct < 0.5 ? 'pass' : 'fail';
      const id  = cardId(r);
      return `<li data-label="${r.page.toLowerCase()} ${vp.toLowerCase()}" data-group="${vp}">
          <a href="#${id}"><span class="dot ${cls}"></span>${r.page}</a>
        </li>`;
    }).join('\n        ');
    return `<li class="vp-group" id="${vpId}">
        <button class="vp-heading" aria-expanded="true" data-target="${vpId}-list">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3l3 4 3-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
          ${vp.charAt(0).toUpperCase() + vp.slice(1)}
          <span class="vp-count">${items.length}</span>
        </button>
        <ul id="${vpId}-list">
          ${pageLinks}
        </ul>
      </li>`;
  }).join('\n      ');

  // Build result cards
  const cards = results.map(r => {
    const cls = r.diffPct < 0.5 ? 'pass' : 'fail';
    const id  = cardId(r);
    return `
    <section class="card ${cls}" id="${id}">
      <div class="card-header">
        <span class="badge ${cls}">${cls.toUpperCase()}</span>
        <h2>${r.viewport} / ${r.page}</h2>
        <span class="meta">${r.diffPct.toFixed(3)}% diff &nbsp;(${r.diffPixels.toLocaleString()} / ${r.totalPixels.toLocaleString()} px)</span>
      </div>
      <div class="images">
        <figure><figcaption>SOURCE</figcaption><img src="${r.sourceSrc}" loading="lazy" alt="source"></figure>
        <figure><figcaption>TARGET</figcaption><img src="${r.targetSrc}" loading="lazy" alt="target"></figure>
        <figure><figcaption>DIFF</figcaption><img src="${r.diffSrc}" loading="lazy" alt="diff"></figure>
      </div>
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Diff Report</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- ── Main content ─────────────────────────────────────────── -->
  <div class="main-content">
    <header>
      <h1>Visual Diff Report</h1>
      <p>SOURCE: <strong>${sourceUrl}</strong></p>
      <p>TARGET: <strong>${targetUrl}</strong></p>
      <p>Generated: ${date}</p>
    </header>

    <div class="summary">
      <div class="stat pass-s"><span>${pass}</span><label>Passed</label></div>
      <div class="stat fail-s"><span>${fail}</span><label>Failed</label></div>
      <div class="stat"><span>${results.length}</span><label>Total</label></div>
    </div>

    ${cards}

    <footer>
      Pixel tolerance: ${(0.1 * 100).toFixed(0)}% per pixel &nbsp;|&nbsp; Fail threshold: ≥ 0.5% changed pixels
    </footer>
  </div>

  <!-- ── Search sidebar ───────────────────────────────────────── -->
  <aside class="sidebar">
    <h3>Pages</h3>

    <div class="search-wrap">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input id="search" type="search" placeholder="Search pages…" autocomplete="off">
    </div>

    <ul id="nav-list">
      ${navItems}
    </ul>
    <p id="no-results">No pages match.</p>
  </aside>

  <script>
    // Image zoom
    document.querySelectorAll('.images img').forEach(img =>
      img.addEventListener('click', () => img.classList.toggle('zoomed'))
    );

    // Sidebar search — filters across all groups; shows group if any child matches
    const input  = document.getElementById('search');
    const items  = document.querySelectorAll('#nav-list li[data-label]');
    const groups = document.querySelectorAll('#nav-list .vp-group');
    const noRes  = document.getElementById('no-results');

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      let totalVisible = 0;

      groups.forEach(group => {
        const children = group.querySelectorAll('li[data-label]');
        let groupVisible = 0;
        children.forEach(li => {
          const match = !q || li.dataset.label.includes(q);
          li.classList.toggle('hidden', !match);
          if (match) groupVisible++;
        });
        // hide the whole group heading if nothing inside matches
        group.classList.toggle('hidden', groupVisible === 0);
        totalVisible += groupVisible;
      });

      noRes.style.display = totalVisible === 0 ? 'block' : 'none';
    });

    // Collapse / expand viewport groups
    document.querySelectorAll('.vp-heading').forEach(btn => {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        document.getElementById(btn.dataset.target).classList.toggle('collapsed', expanded);
      });
    });

    // Highlight sidebar link for the card currently in view
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        document.querySelectorAll('#nav-list a.active').forEach(a => a.classList.remove('active'));
        const a = document.querySelector('#nav-list a[href="#' + e.target.id + '"]');
        if (a) { a.classList.add('active'); a.scrollIntoView({ block: 'nearest' }); }
      });
    }, { threshold: 0.25 });

    document.querySelectorAll('.card').forEach(c => observer.observe(c));
  </script>
</body>
</html>`;
}

/** Stable anchor id for a result card */
function cardId(r) {
  return `${r.viewport}-${r.page}`.replace(/[^a-z0-9-]/gi, '-');
}

module.exports = { buildReport };
