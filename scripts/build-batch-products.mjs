import fs from 'node:fs';

const rows = JSON.parse(fs.readFileSync('data/batch-1-rows.json', 'utf8'));
const existingModels = ['MW322SGB1','50A6N','43LR6000','FAC1802INV-HC','PV-18TP41GM','61WC-RQ','6060 T-840','MW-AIRF0860BK','AF85WA2CN','MWAUD-MHF2001','AUD 110HP','MWAUD-PTS1201DB','HISBLE1000DE-HB','MWFAN-ESF1804','PV-56WC','MWKCA-OVEN2501','PV-MZ19B','MAXIGEN EK50'];
const normalize = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const modelKeys = (value) => { const normalized = normalize(value); return new Set([normalized, normalized.replace(/^MAXI/, ''), normalized.replace(/^TV/, ''), normalized.replace(/^LG/, '')]); };
const existingSet = new Set(existingModels.flatMap((model) => [...modelKeys(model)]));
const sourceBrand = (file) => file.startsWith('POLYSTAR') ? 'Polystar' : file === 'MAXI.pdf' ? 'Maxi' : file === 'LG.pdf' ? 'LG' : file.startsWith('HPZ') ? 'Hisense' : null;
const categoryFor = (row, brand) => {
  const text = `${row.sourceModel} ${row.sourceDescription}`.toLowerCase();
  if (text.includes('television') || text.includes('tv ') || text.includes('smart tv') || text.includes('oled') || text.includes('qled')) return 'Televisions';
  if (text.includes('air conditioner') || text.includes('split ') || text.includes('floor standing ac') || text.includes('window ac') || text.includes('ac ')) return 'Air Conditioners';
  if (text.includes('refrigerator') || text.includes('fridge') || text.includes('freezer') || text.includes('chest freezer') || text.includes('showcase') || text.includes('beverage')) return 'Refrigeration';
  if (text.includes('washing machine') || text.includes('washmachine') || text.includes('washer')) return 'Laundry';
  if (text.includes('speaker') || text.includes('home theater') || text.includes('sound bar') || text.includes('hifi') || text.includes('audio')) return 'Audio';
  if (text.includes('fan')) return 'Fans';
  if (text.includes('cooker') || text.includes('oven') || text.includes('hob') || text.includes('microwave') || text.includes('air fryer') || text.includes('blender') || text.includes('kettle') || text.includes('toaster') || text.includes('grill') || text.includes('mixer') || text.includes('juice') || text.includes('processor') || text.includes('iron')) return 'Kitchen Appliances';
  if (text.includes('generator') || text.includes('ups') || text.includes('voltage') || text.includes('bracket') || text.includes('extension') || text.includes('installation kit')) return 'Power & Electrical';
  if (text.includes('phone') || text.includes('xiaomi') || text.includes('tecno') || text.includes('vivo') || text.includes('villaon') || text.includes('watch') || text.includes('headphone') || text.includes('mouse') || text.includes('charger') || text.includes('adapter') || text.includes('memory card')) return 'Mobile & Accessories';
  return brand === 'LG' ? 'LG Appliances' : 'Other Electronics';
};
const subcategoryFor = (row, category) => {
  const text = row.sourceDescription.toLowerCase();
  if (category === 'Air Conditioners') return text.includes('floor') ? 'Floor standing' : text.includes('window') ? 'Window' : 'Split';
  if (category === 'Refrigeration') return text.includes('freezer') ? 'Freezers' : 'Refrigerators';
  if (category === 'Kitchen Appliances') return text.includes('cooker') || text.includes('hob') ? 'Cookers' : text.includes('oven') || text.includes('microwave') ? 'Ovens & microwaves' : 'Small appliances';
  if (category === 'Mobile & Accessories') return 'Phones and accessories';
  return category;
};
const clean = (value) => value.replace(/\s+/g, ' ').replace(/^HT\s+/i, '').trim();
const title = (row, brand) => {
  const text = clean(row.sourceDescription || row.sourceModel);
  if (brand) return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const products = [];
const duplicateRows = [];
const seen = new Map();
for (const row of rows) {
  const brand = sourceBrand(row.sourceFilename);
  const model = clean(row.sourceModel);
  const key = normalize(`${brand ?? 'unbranded'} ${model}`);
  const modelMatchesExisting = [...modelKeys(model)].some((modelKey) => existingSet.has(modelKey));
  if (seen.has(key) || modelMatchesExisting) {
    duplicateRows.push(row);
    continue;
  }
  seen.set(key, row);
  const category = categoryFor(row, brand);
  products.push({
    id: `${slug(brand ?? 'catalogue')}-${slug(model || row.sourceDescription)}-${row.sourcePage}`,
    brand,
    category,
    subcategory: subcategoryFor(row, category),
    model: model || null,
    name: title(row, brand),
    description: clean(row.sourceDescription || row.sourceModel),
    specs: clean(row.sourceDescription || '').split(/[,;•]+/).map((item) => item.trim()).filter(Boolean).slice(0, 8),
    cost: null,
    price: row.sourcePrice,
    imageStatus: 'pending',
    sourceFile: row.sourceFilename,
    sourcePage: row.sourcePage,
    stockStatus: 'available'
  });
}
fs.writeFileSync('src/data/batch1-products.ts', `import type { Product } from './products';\n\nexport const batchOneProducts: Product[] = ${JSON.stringify(products, null, 2)};\n`);
const byFile = {};
for (const file of [...new Set(rows.map((row) => row.sourceFilename))]) byFile[file] = { sourceRows: rows.filter((row) => row.sourceFilename === file).length, productsImported: products.filter((product) => product.sourceFile === file).length, duplicates: duplicateRows.filter((row) => row.sourceFilename === file).length, pages: [...new Set(rows.filter((row) => row.sourceFilename === file).map((row) => row.sourcePage))].length };
const report = { batch: 1, generatedAt: new Date().toISOString(), pdfFiles: 5, pagesInspected: 31, unreadablePages: 1, sourceRowsExtracted: rows.length, existingProductsPreserved: existingModels.length, newProductsImported: products.length, duplicateRecords: duplicateRows.length, productsRequiringManualReview: products.filter((product) => !product.price || !product.model).length, byFile, notes: ['The blank fourth page of MAXI.pdf was inspected and contained no extractable product rows.', 'Descriptions and prices come from the PDF text layers; image verification remains pending for newly imported records.', 'HPZ public prices use the rightmost RRP column because the document provides separate ex-depot, VAT, dealer, and RRP values.'] };
fs.writeFileSync('data/batch-1-import-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ products: products.length, duplicates: duplicateRows.length, manualReview: report.productsRequiringManualReview }, null, 2));
