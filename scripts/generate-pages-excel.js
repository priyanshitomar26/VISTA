#!/usr/bin/env node
/**
 * Creates config/pages.xlsx with the default columns and sample rows.
 *
 * Usage:
 *   node scripts/generate-pages-excel.js          # skips if the file exists
 *   node scripts/generate-pages-excel.js --force  # overwrite existing workbook
 */

// @ts-check
const fs = require('fs');
const XLSX = require('@e965/xlsx');
const { WORKBOOK_PATH, SHEET_NAME } = require('../config/excel-loader.js');

const force = process.argv.includes('--force');

if (fs.existsSync(WORKBOOK_PATH) && !force) {
  console.log(`${WORKBOOK_PATH} already exists. Use --force to overwrite.`);
  process.exit(0);
}

const HEADERS = [
  'S No.',
  'SOURCE_BASE_URL',
  'TARGET_BASE_URL',
  'Page Name',
  'fullPage',
  'waitForSelector',
  'waitMs',
  'skip',
  'maskSelectors',
];

const ROWS = [
  [1, 'https://www.google.com', 'https://www.amazon.in', 'Home', true, 'body', '', false, ''],
  [2, 'https://certification.adobe.com/courses', 'https://certification.adobe.com/courses/1064', 'Course Page', true, 'body', '', false, ''],
];

const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...ROWS]);
sheet['!cols'] = [
  { wch: 6 }, { wch: 42 }, { wch: 42 }, { wch: 16 },
  { wch: 9 }, { wch: 18 }, { wch: 8 }, { wch: 7 }, { wch: 28 },
];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
XLSX.writeFile(workbook, WORKBOOK_PATH);

console.log(`Created ${WORKBOOK_PATH}`);
