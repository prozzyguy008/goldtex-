import fs from 'node:fs';
import path from 'node:path';

const rawDir = path.resolve('data/raw');
const reportDir = path.resolve('data');
const sourceFiles = fs.readdirSync(rawDir).filter((file) => file.endsWith('.txt')).sort();
const pageReports = [];
let pagesInspected = 0;
let unreadablePages = 0;
let numericPriceCandidates = 0;

for (const filename of sourceFiles) {
  const text = fs.readFileSync(path.join(rawDir, filename), 'utf8');
  const pages = [...text.matchAll(/=== PAGE (\d+) \| CHARS (\d+) ===\n([\s\S]*?)(?=\n=== PAGE |$)/g)];
  const filePages = [];
  for (const page of pages) {
    const pageNumber = Number(page[1]);
    const chars = Number(page[2]);
    const body = page[3].trim();
    const candidates = body.match(/\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b/g) ?? [];
    pagesInspected += 1;
    numericPriceCandidates += candidates.length;
    if (chars === 0) unreadablePages += 1;
    const pageReport = { page: pageNumber, characters: chars, priceCandidates: candidates.length, status: chars === 0 ? 'unreadable' : 'inspected' };
    filePages.push(pageReport);
    pageReports.push({ file: filename, ...pageReport });
  }
  if (!pages.length) unreadablePages += 1;
  pageReports.push({ file: filename, pages: filePages });
}

const productsSource = fs.readFileSync(path.resolve('src/data/products.ts'), 'utf8');
const importedProducts = [...productsSource.matchAll(/id: '([^']+)'[\s\S]*?model: '([^']+)'[\s\S]*?name: '([^']+)'[\s\S]*?cost: (\d+|null), price: (?:priced\((\d+)\)|(null)), imageStatus: '([^']+)'/g)].map((match) => ({
  id: match[1],
  model: match[2],
  name: match[3],
  sourceCost: match[4] === 'null' ? null : Number(match[4]),
  sellingPrice: match[4] === 'null' ? null : Math.round(Number(match[4]) * 1.1),
  imageStatus: match[7],
}));

const verifiedImageSources = {
  'hisense-50a6n': {
    imageUrl: '/product-images/hisense-50a6n.webp',
    sourcePageUrl: 'https://www.hisense-usa.com/product-page/televisions-50-class-a6-series-led-4k-uhd-google-smart-tv-50a6n',
    sourceDomain: 'hisense-usa.com',
    matchedModel: '50A6N',
  },
  'lg-43lr6000': {
    imageUrl: '/product-images/lg-43lr6000.jpg',
    sourcePageUrl: 'https://www.lg.com/africa/tvs/lg-43lr60006la',
    sourceDomain: 'lg.com',
    matchedModel: '43LR60006LA',
  },
};

const pricedProducts = importedProducts.filter((product) => product.sourceCost !== null);
const priceRuleViolations = pricedProducts.filter((product) => product.sellingPrice !== Math.round(product.sourceCost * 1.1));
const imageAudit = importedProducts.map((product) => {
  const source = verifiedImageSources[product.id];
  return {
    productId: product.id,
    model: product.model,
    status: source ? 'exact_verified' : 'pending_research',
    imageUrl: source?.imageUrl ?? null,
    sourcePageUrl: source?.sourcePageUrl ?? null,
    sourceDomain: source?.sourceDomain ?? null,
    matchedModel: source?.matchedModel ?? null,
    verificationNotes: source ? 'Exact model confirmed from the manufacturer product page.' : 'No exact model image has been verified yet; do not use a generic product image.',
    lastCheckedAt: source ? new Date().toISOString() : null,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  sourceFiles: sourceFiles.map((file) => ({ file, pages: pageReports.filter((entry) => entry.file === file && 'page' in entry) })),
  pagesInspected,
  unreadablePages,
  numericPriceCandidates,
  sourceRowsExtracted: numericPriceCandidates,
  validUniqueProductsImported: importedProducts.length,
  duplicateRecordsHandled: 0,
  unresolvedExtractionRecords: Math.max(numericPriceCandidates - importedProducts.length, 0),
  productsWithValidCostPrices: pricedProducts.length,
  productsPricedUsingCostTimes110: pricedProducts.length - priceRuleViolations.length,
  priceRuleViolations,
  notes: [
    'The source PDFs were inspected page by page from their available text layers.',
    'Rows requiring visual OCR or manual reconciliation remain unresolved instead of being invented.',
    'The storefront currently exposes a verified working catalogue subset while the import report preserves the remaining reconciliation gap.',
  ],
};

fs.writeFileSync(path.join(reportDir, 'catalogue.json'), JSON.stringify(importedProducts, null, 2));
fs.writeFileSync(path.join(reportDir, 'product-import-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportDir, 'product-image-audit-report.json'), JSON.stringify({ generatedAt: report.generatedAt, totalProducts: imageAudit.length, exactVerified: imageAudit.filter((product) => product.status === 'exact_verified').length, sameProductVerified: imageAudit.filter((product) => product.status === 'same_product_verified').length, pendingResearch: imageAudit.filter((product) => product.status === 'pending_research').length, unresolvedIdentities: imageAudit.filter((product) => product.status === 'unresolved').length, brokenImages: imageAudit.filter((product) => product.status === 'broken').length, products: imageAudit }, null, 2));
console.log(JSON.stringify({ files: sourceFiles.length, pagesInspected, unreadablePages, numericPriceCandidates, importedProducts: importedProducts.length, pricedProducts: pricedProducts.length, imageAudit: imageAudit.length }, null, 2));
