import fs from 'node:fs';

// Parse extraction output (lines starting with { are JSON rows; FILE/COUNT lines separate sources)
const rawLines = fs.readFileSync('data/batch-2-rows.txt', 'utf8').split('\n');
const jsonLines = rawLines.filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));

// Map each row to its source file by matching FILE boundaries
const fileBoundaries = [];
for (let i = 0; i < rawLines.length; i++) {
  if (rawLines[i].startsWith('FILE ')) {
    const match = rawLines[i].match(/^FILE (.+?) PAGES (\d+)$/);
    fileBoundaries.push({ file: match[1], lineIndex: i });
  }
}
function sourceForRowIndex(lineIdx) {
  let source = fileBoundaries[0];
  for (const b of fileBoundaries) {
    if (b.lineIndex <= lineIdx) source = b;
  }
  return source.file;
}

const rows = [];
let jsonIdx = 0;
for (let i = 0; i < rawLines.length; i++) {
  if (rawLines[i].startsWith('{')) {
    const parsed = JSON.parse(rawLines[i]);
    parsed.sourceFilename = sourceForRowIndex(i);
    rows.push(parsed);
    jsonIdx++;
  }
}

// Load existing products to dedup against
const existingProductsFile = fs.readFileSync('src/data/products.ts', 'utf8');
// Extract the existing model keys from batch1-products + original 18
const batch1File = fs.readFileSync('src/data/batch1-products.ts', 'utf8');
const batch1Match = batch1File.match(/export const batchOneProducts: Product\[\] = \[([\s\S]*)\];/);
const batch1Products = JSON.parse('[' + batch1Match[1].trim() + ']');

// Original 18 model list
const originalModels = ['MW322SGB1', '50A6N', '43LR6000', 'FAC1802INV-HC', 'PV-18TP41GM', '61WC-RQ', '6060 T-840', 'MW-AIRF0860BK', 'AF85WA2CN', 'MWAUD-MHF2001', 'AUD 110HP', 'MWAUD-PTS1201DB', 'HISBLE1000DE-HB', 'MWFAN-ESF1804', 'PV-56WC', 'MWKCA-OVEN2501', 'PV-MZ19B', 'MAXIGEN EK50'];

const normalize = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const modelKeys = (value) => {
  const n = normalize(value);
  return new Set([n, n.replace(/^MAXI/, ''), n.replace(/^TV/, ''), n.replace(/^LG/, ''), n.replace(/^MWACM/, ''), n.replace(/^MW/, '')]);
};

// Build existing model key set from batch1 + original
const existingSet = new Set();
for (const m of originalModels) for (const k of modelKeys(m)) existingSet.add(k);
for (const p of batch1Products) if (p.model) for (const k of modelKeys(p.model)) existingSet.add(k);

// Source brand derivation
const sourceBrand = (file) => {
  if (file.startsWith('Hisense')) return 'Hisense';
  if (file.startsWith('Harefield')) return 'TEC';
  if (file.startsWith('08-Aug')) return 'Maxi';
  return null;
};

// Category inference (extends the existing logic)
const categoryFor = (row, brand) => {
  const text = `${row.model} ${row.description}`.toLowerCase();
  if (text.includes('television') || text.includes('tv ') || text.includes('smart tv') || text.includes('oled') || text.includes('qled') || text.includes('uled') || text.includes('led hd') || text.includes('led fhd') || text.includes('uhd 4k') || text.includes('mini-led') || text.includes('mini led') || text.includes('canvas') || text.includes('led tv') || text.includes('inch') && text.includes('4k')) return 'Televisions';
  if (text.includes('air conditioner') || text.includes('split ') || text.includes('floor standing ac') || text.includes('window ac') || text.includes('ac ') || text.includes('btu') || text.includes('ceiling') || text.includes('cassette')) return 'Air Conditioners';
  if (text.includes('refrigerator') || text.includes('fridge') || text.includes('freezer') || text.includes('chest freezer') || text.includes('showcase') || text.includes('beverage') || text.includes('water dispenser') || text.includes('water heater')) return 'Refrigeration';
  if (text.includes('washing machine') || text.includes('washmachine') || text.includes('washer') || text.includes('wash ') || text.includes('dryer')) return 'Laundry';
  if (text.includes('speaker') || text.includes('home theatre') || text.includes('home theater') || text.includes('sound bar') || text.includes('soundbar') || text.includes('hifi') || text.includes('audio') || text.includes('party rocker') || text.includes('multimedia speaker')) return 'Audio';
  if (text.includes('fan') || text.includes('mist ')) return 'Fans';
  if (text.includes('cooker') || text.includes('oven') || text.includes('hob') || text.includes('microwave') || text.includes('air fryer') || text.includes('blender') || text.includes('kettle') || text.includes('toaster') || text.includes('grill') || text.includes('mixer') || text.includes('juice') || text.includes('processor') || text.includes('iron') || text.includes('sandwich') || text.includes('deep fryer') || text.includes('pressure cooker') || text.includes('induction') || text.includes('electric stove') || text.includes('gas stove')) return 'Kitchen Appliances';
  if (text.includes('generator') || text.includes('ups') || text.includes('voltage') || text.includes('bracket') || text.includes('extension') || text.includes('installation kit') || text.includes('power strip') || text.includes('stabilizer') || text.includes('protector') || text.includes('swatter') || text.includes('solar')) return 'Power & Electrical';
  if (text.includes('led lamp') || text.includes('bulb') || text.includes('flood light') || text.includes('mosquito')) return 'Lighting';
  if (text.includes('mobile base') || text.includes('wall mount') || text.includes('tv stand')) return 'Accessories';
  return 'Other Electronics';
};

const subcategoryFor = (row, category) => {
  const text = row.description.toLowerCase();
  if (category === 'Air Conditioners') return text.includes('floor') ? 'Floor standing' : text.includes('ceiling') || text.includes('cassette') ? 'Cassette' : 'Split';
  if (category === 'Refrigeration') return text.includes('freezer') ? 'Freezers' : text.includes('water dispenser') || text.includes('water heater') ? 'Water appliances' : 'Refrigerators';
  if (category === 'Kitchen Appliances') return text.includes('cooker') || text.includes('hob') || text.includes('gas stove') ? 'Cookers' : text.includes('oven') || text.includes('microwave') || text.includes('induction') ? 'Ovens & microwaves' : 'Small appliances';
  if (category === 'Audio') return text.includes('soundbar') || text.includes('sound bar') ? 'Sound bars' : text.includes('party') ? 'Party speakers' : 'HiFi & speakers';
  return category;
};

const clean = (value) => value.replace(/\s+/g, ' ').trim();
const title = (row, brand) => {
  const text = clean(row.description || row.model);
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

const parsePrice = (priceStr) => {
  if (!priceStr) return null;
  const num = parseFloat(priceStr.replace(/,/g, ''));
  return isNaN(num) ? null : num;
};

const products = [];
const duplicateRows = [];
const seen = new Map();

for (const row of rows) {
  const brand = sourceBrand(row.sourceFilename);
  const model = clean(row.model);
  const key = normalize(`${brand ?? 'unbranded'} ${model}`);
  const modelMatchesExisting = [...modelKeys(model)].some((k) => existingSet.has(k));

  if (seen.has(key) || modelMatchesExisting) {
    duplicateRows.push(row);
    continue;
  }
  seen.set(key, row);

  const category = categoryFor(row, brand);
  const price = parsePrice(row.price);
  products.push({
    id: `${slug(brand ?? 'catalogue')}-${slug(model || row.description)}-${row.page}`,
    brand,
    category,
    subcategory: subcategoryFor(row, category),
    model: model || null,
    name: title(row, brand),
    description: clean(row.description || row.model),
    specs: clean(row.description || '').split(/[,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 8),
    cost: null,
    price,
    imageStatus: 'pending',
    sourceFile: row.sourceFilename,
    sourcePage: row.page,
    stockStatus: 'available',
  });
}

// Write batch2 products file
fs.writeFileSync('src/data/batch2-products.ts', `import type { Product } from './products';\n\nexport const batchTwoProducts: Product[] = ${JSON.stringify(products, null, 2)};\n`);

// Build import report
const byFile = {};
for (const file of [...new Set(rows.map((r) => r.sourceFilename))]) {
  byFile[file] = {
    sourceRows: rows.filter((r) => r.sourceFilename === file).length,
    productsImported: products.filter((p) => p.sourceFile === file).length,
    duplicates: duplicateRows.filter((r) => r.sourceFilename === file).length,
    pages: [...new Set(rows.filter((r) => r.sourceFilename === file).map((r) => r.page))].length,
  };
}

const report = {
  batch: 2,
  generatedAt: new Date().toISOString(),
  pdfFiles: 3,
  pagesInspected: 26,
  sourceRowsExtracted: rows.length,
  existingProductsPreserved: originalModels.length + batch1Products.length,
  newProductsImported: products.length,
  duplicateRecords: duplicateRows.length,
  productsRequiringManualReview: products.filter((p) => !p.price || !p.model).length,
  byFile,
  notes: [
    'Hisense.pdf: 3 pages, flat text layout — model, description, and price on the same y-coordinate line.',
    'Harefield: 1 page, 8-column table — TEC brand cookers, generators, stabilizers. RRP column used as public price.',
    '08-Aug Pricelist: 22 pages, 6-column table — MW white-label brand. Model spans two lines (e.g. "MWACM-" + "FAC1802INV-HC").',
    'Deduplication matched against all 552 existing products (18 original + 534 batch 1).',
  ],
};
fs.writeFileSync('data/batch-2-import-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ products: products.length, duplicates: duplicateRows.length, manualReview: report.productsRequiringManualReview, byFile }, null, 2));
