import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';

const files = ['Hisense.pdf', 'Harefield Latest Price 27th July 2026.pdf', '08-Aug-2026 Pircelist(1) (2).pdf'];
for (const file of files) {
  const pdf = await pdfjsLib.getDocument({data: new Uint8Array(fs.readFileSync(file)), useWorkerFetch:false, isEvalSupported:false}).promise;
  console.log(`\n=== ${file} (${pdf.numPages} pages) ===`);
  const page = await pdf.getPage(1);
  const c = await page.getTextContent();
  const items = c.items.filter(i=>i.str.trim()).map(i=>({s:i.str.trim(),x:Math.round(i.transform[4]),y:Math.round(i.transform[5])}));
  for (const item of items.slice(0, 80)) {
    console.log(`  x=${item.x} y=${item.y} "${item.s}"`);
  }
  console.log(`  ... total ${items.length} items on page 1`);
}
