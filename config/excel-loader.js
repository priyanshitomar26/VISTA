/**
 * Reads the visual-test configuration from config/pages.xlsx.
 *
 * Sheet "Pages" columns:
 *   S No. | SOURCE_BASE_URL | TARGET_BASE_URL | Page Name |
 *   [path] | [fullPage] | [waitForSelector] | [waitMs] | [skip] | [maskSelectors]
 *
 * Each row is one comparison: the SOURCE URL is captured and compared against
 * the TARGET URL. Both may be full URLs pointing at completely different sites.
 * If a row leaves a URL blank, the first row's URL is used instead, and an
 * optional `path` column is appended to whichever URL is used.
 */

// @ts-check
const path = require('path');
const fs = require('fs');
const XLSX = require('@e965/xlsx');

const WORKBOOK_PATH = path.resolve(__dirname, 'pages.xlsx');
const SHEET_NAME = 'Pages';

/**
 * @param {unknown} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', 'y', '1'].includes(String(value).trim().toLowerCase());
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function toList(value) {
  if (!value) return [];
  return String(value)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function toText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

/**
 * @param {string} base
 * @param {string} [subPath]
 * @returns {string}
 */
function joinUrl(base, subPath) {
  const trimmedBase = base.replace(/\/+$/, '');
  if (!subPath) return trimmedBase;
  return `${trimmedBase}/${subPath.replace(/^\/+/, '')}`;
}

function loadConfig() {
  if (!fs.existsSync(WORKBOOK_PATH)) {
    throw new Error(
      `Config workbook not found at ${WORKBOOK_PATH}. Run "npm run config:init" to create it.`
    );
  }

  const workbook = XLSX.readFile(WORKBOOK_PATH);
  const sheet = workbook.Sheets[SHEET_NAME] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`No worksheet found in ${WORKBOOK_PATH}`);

  const rows = /** @type {Record<string, unknown>[]} */ (
    XLSX.utils.sheet_to_json(sheet, { defval: '' })
  );

  const sourceRow = rows.find((r) => toText(r.SOURCE_BASE_URL));
  const targetRow = rows.find((r) => toText(r.TARGET_BASE_URL));
  const SOURCE_BASE_URL = sourceRow ? toText(sourceRow.SOURCE_BASE_URL).replace(/\/+$/, '') : '';
  const TARGET_BASE_URL = targetRow ? toText(targetRow.TARGET_BASE_URL).replace(/\/+$/, '') : '';

  if (!SOURCE_BASE_URL || !TARGET_BASE_URL) {
    throw new Error(`SOURCE_BASE_URL and TARGET_BASE_URL must be set in ${WORKBOOK_PATH}`);
  }

  const PAGES = rows
    .filter((r) => toText(r['Page Name']) || toText(r.name))
    .map((r) => {
      const subPath = toText(r.path);
      return {
        name: toText(r['Page Name']) || toText(r.name),
        sourceUrl: joinUrl(toText(r.SOURCE_BASE_URL) || SOURCE_BASE_URL, subPath),
        targetUrl: joinUrl(toText(r.TARGET_BASE_URL) || TARGET_BASE_URL, subPath),
        fullPage: toBool(r.fullPage, true),
        waitForSelector: toText(r.waitForSelector) || undefined,
        waitMs: toText(r.waitMs) ? Number(r.waitMs) : undefined,
        skip: toBool(r.skip, false),
        maskSelectors: toList(r.maskSelectors),
      };
    });

  if (PAGES.length === 0) {
    throw new Error(`No pages defined in ${WORKBOOK_PATH} (sheet "${SHEET_NAME}")`);
  }

  return { SOURCE_BASE_URL, TARGET_BASE_URL, PAGES };
}

module.exports = { loadConfig, WORKBOOK_PATH, SHEET_NAME };
