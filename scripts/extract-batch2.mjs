import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';

const files = process.argv.slice(2);

const isNumeric = (s) => /^\d[\d,]*(?:\.\d+)?$/.test(s);

for (const file of files) {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useWorkerFetch: false, isEvalSupported: false }).promise;
  const kind = file.startsWith('Hisense') ? 'hisense' : file.startsWith('Harefield') ? 'harefield' : 'mwave';
  console.log(`FILE ${file} PAGES ${pdf.numPages}`);
  let count = 0;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const c = await page.getTextContent();
    const items = c.items.filter(i => i.str.trim()).map(i => ({ s: i.str.trim(), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]) }));

    if (kind === 'hisense') {
      // Model at x~95, description at x~180, price at x>=556, all same y
      const candidates = items.filter(i => i.x >= 90 && i.x <= 100 && i.s.length >= 3);
      console.log(`PAGE ${n} CANDIDATES ${candidates.length}`);
      for (const cur of candidates) {
        const desc = items.filter(i => i.x >= 170 && i.x <= 450 && i.y === cur.y).sort((a, b) => b.y - a.y).map(i => i.s).join(' ');
        const price = items.filter(i => i.x >= 555 && i.y === cur.y && isNumeric(i.s)).map(i => i.s).at(-1) ?? '';
        console.log(JSON.stringify({ page: n, model: cur.s, description: desc, price }));
        count++;
      }
    } else if (kind === 'harefield') {
      // Reference at x~132 (100xxxxxx), model+description at x~178, RRP at x>=534, all same y
      const candidates = items.filter(i => i.x >= 130 && i.x <= 140 && /^100\d{6}$/.test(i.s));
      console.log(`PAGE ${n} CANDIDATES ${candidates.length}`);
      for (const cur of candidates) {
        const desc = items.filter(i => i.x >= 170 && i.x <= 360 && i.y === cur.y).map(i => i.s).join(' ');
        const price = items.filter(i => i.x >= 530 && i.y === cur.y && isNumeric(i.s)).map(i => i.s).at(-1) ?? '';
        console.log(JSON.stringify({ page: n, model: cur.s, description: desc, price }));
        count++;
      }
    } else if (kind === 'mwave') {
      // Price at x>=499 (one per product), model at x~148 (multi-line), description at x~284 (multi-line)
      // Use price y as row center, midpoints between consecutive prices as boundaries
      const prices = items.filter(i => i.x >= 495 && isNumeric(i.s)).sort((a, b) => b.y - a.y);
      console.log(`PAGE ${n} CANDIDATES ${prices.length}`);
      for (let j = 0; j < prices.length; j++) {
        const cur = prices[j];
        const prev = prices[j - 1];
        const next = prices[j + 1];
        const topBound = prev ? (prev.y + cur.y) / 2 : Infinity;
        const bottomBound = next ? (cur.y + next.y) / 2 : -Infinity;
        const model = items.filter(i => i.x >= 145 && i.x <= 155 && i.y > bottomBound && i.y <= Math.min(topBound, 790)).sort((a, b) => b.y - a.y).map(i => i.s).join(' ');
        const desc = items.filter(i => i.x >= 280 && i.x <= 470 && i.y > bottomBound && i.y <= Math.min(topBound, 790) && !/^(PCS|CTN|SPEC|DISPLAY|CATEGORY|SUBCATEGORY|MODEL)$/.test(i.s)).sort((a, b) => b.y - a.y).map(i => i.s).join(' ');
        console.log(JSON.stringify({ page: n, model, description: desc, price: cur.s }));
        count++;
      }
    }
  }
  console.log(`COUNT ${count}`);
}
