#!/usr/bin/env node
// @ts-nocheck

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');
const { buildSanityReport } = require('./sanity-report-builder');
const sanityUrls = require('../config/sanity-urls.json');

const REPORT_DIR = path.resolve('sanity-report');
const JSON_RESULTS = path.join(REPORT_DIR, 'results.json');
const playwrightCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

/** @typedef {{ title: string, description: string, speed: number, statusCode: number, error?: string }} PageMetadata */

async function main() {
fs.mkdirSync(REPORT_DIR, { recursive: true });
if (fs.existsSync(JSON_RESULTS)) fs.unlinkSync(JSON_RESULTS);

const result = spawnSync(
  playwrightCommand,
  [
    'playwright',
    'test',
    'tests/sanity.spec.ts',
    '--project=chrome-desktop',
    '--project=edge-desktop',
    '--project=safari-desktop',
    '--workers=4',
    '--reporter=json',
  ],
  {
    encoding: 'utf8',
    windowsHide: false,
    shell: process.platform === 'win32',
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: JSON_RESULTS },
  },
);

if (result.stderr) process.stderr.write(result.stderr);

let reportData;
try {
  reportData = JSON.parse(fs.readFileSync(JSON_RESULTS, 'utf8'));
} catch (error) {
  console.error(`Could not read Playwright JSON results from ${JSON_RESULTS}.`);
  if (result.error) console.error(result.error.message);
  if (result.stdout) process.stdout.write(result.stdout);
  process.exit(result.status ?? 1);
}

const pageMetadata = await collectPageMetadata();
const reportPath = buildSanityReport(reportData, REPORT_DIR, pageMetadata);
fs.unlinkSync(JSON_RESULTS);
console.log(`\nSanity report saved → ${reportPath}`);

try {
  spawnSync('cmd.exe', ['/c', 'start', '', reportPath], { stdio: 'ignore', windowsHide: true });
} catch {
  console.log(`Open manually: ${reportPath}`);
}

process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function collectPageMetadata() {
  /** @type {Record<string, PageMetadata>} */
  const metadata = {};
  for (const page of sanityUrls) {
    const started = Date.now();
    try {
      const response = await fetchSource(page.url);
      const html = response.body;
      const title = decodeHtmlEntities(
        readMetaContent(html, 'property', 'og:title') ||
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '',
      );
      const description = decodeHtmlEntities(
        readMetaContent(html, 'name', 'description') ||
        readMetaContent(html, 'property', 'og:description'),
      );
      metadata[page.url] = {
        title,
        description,
        speed: Date.now() - started,
        statusCode: response.statusCode,
      };
    } catch (error) {
      metadata[page.url] = {
        title: '',
        description: '',
        speed: Date.now() - started,
        statusCode: 0,
          error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return metadata;
}

/** @param {string} url @returns {Promise<{ statusCode: number, body: string }>} */
function fetchSource(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      rejectUnauthorized: false,
      headers: { 'User-Agent': 'Mozilla/5.0 (sanity-report)' },
    }, (response) => {
      const chunks = [];
      response.setEncoding('utf8');
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        statusCode: response.statusCode ?? 0,
        body: chunks.join(''),
      }));
    });
    request.on('error', reject);
  });
}

/** @param {string} html @param {string} attribute @param {string} value */
function readMetaContent(html, attribute, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => new RegExp(`${attribute}=["']${value}["']`, 'i').test(candidate));
  return tag?.match(/content=["']([^"']*)["']/i)?.[1]?.trim() ?? '';
}

/** @param {string} value */
function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}