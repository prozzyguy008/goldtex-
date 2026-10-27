import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';

const files = process.argv.slice(2);
const modelPattern = /^(?:PV[-A-Z0-9._]+|PVF[-A-Z0-9._]+|PVKL[-A-Z0-9._]+|MAXI[A-Z0-9*()_./-]+|FAN[-A-Z0-9._]+|AF[A-Z0-9._-]+|LG[A-Z0-9._-]+|AUD[-A-Z0-9._]+|REF[-A-Z0-9._]+|WM[-A-Z0-9._]+|MWO[-A-Z0-9._]+|SPL[-A-Z0-9._]+|FS[-A-Z0-9._]+|CEILING[-A-Z0-9._]+|AC[A-Z0-9._-]+|TLA[A-Z0-9._-]+|FLA[A-Z0-9._-]+|HT[A-Z0-9._-]+|100\d{6})$/i;
for (const file of files) {
  const pdf = await pdfjsLib.getDocument({data: new Uint8Array(fs.readFileSync(file)), useWorkerFetch:false, isEvalSupported:false}).promise;
  const kind = file.includes('LG.pdf') ? 'lg' : file.includes('HPZ_') ? 'hpz' : file.includes('MAXI.pdf') ? 'maxi' : 'polystar';
  console.log(`FILE ${file} PAGES ${pdf.numPages}`);
  let count=0;
  for (let n=1;n<=pdf.numPages;n++) {
    const page=await pdf.getPage(n); const c=await page.getTextContent();
    const items=c.items.filter(i=>i.str.trim()).map(i=>({s:i.str.trim(),x:i.transform[4],y:i.transform[5]}));
    const candidates=items.filter(i => kind === 'lg' ? i.x >= 90 && i.x < 200 && i.s.length >= 3 && !/^(TV|Stand|LG|AUD|REF|WASH|MANUAL|AUTOMATIC|COMMERCIAL|MWO|SPL|FS|CEILING|BRACKETS|ACBRACKET|FLOOR|WALL|TOP|SIDE|SINGLE|DOUBLE|DISH|DRYER|REFRIGERATOR|FREEZER|INSTALLATION|STYLER|LG AUDIO|LG TV|LG AC)$/i.test(i.s) && !/^\d[\d,]*$/.test(i.s) : kind === 'hpz' ? i.x >= 160 && i.x < 200 && /^100\d{6}$/.test(i.s) : kind === 'maxi' ? i.x >= 60 && i.x < 130 && i.s.length >= 3 && !/^(MAXI|AC|AIR|COOKER|GAS|TABLE|STANDING|INBUILT|MAXI HOME|APPLIANCES|FAN|INDUSTRIAL|RECHARGEABLE|KETTLE|FOOD|PROCESSOR|GRILL|TOASTER|AIR FRYER|MIXER|BLENDER|DEHUMIDIFIER|INSTALLATION|KIT|UPS|TV STAND|EXTENSION|BRACKET)$/i.test(i.s) : i.x < 80 && modelPattern.test(i.s) && !/^(PV|MAXI|FAN|AF|LG|AUD|REF|WM|MWO|SPL|FS|AC|TLA|FLA|HT)$/i.test(i.s));
    console.log(`PAGE ${n} CANDIDATES ${candidates.length}`);
    for (let j=0;j<candidates.length;j++) {
      const cur=candidates[j]; const prev=candidates[j-1]; const next=candidates[j+1]; const top=prev ? (prev.y+cur.y)/2 : Infinity; const bottom=next ? (cur.y+next.y)/2 : -Infinity;
      const desc=items.filter(i=> kind === 'lg' ? i.x>=200&&i.x<550&&i.y<=top&&i.y>=bottom : kind === 'hpz' ? i.x>=200&&i.x<350&&i.y<=top&&i.y>=bottom : i.x>=105&&i.x<470&&i.y<=top&&i.y>=bottom).sort((a,b)=>b.y-a.y).map(i=>i.s).join(' ');
      const price=items.filter(i=> kind === 'lg' ? i.x>=540&&i.y<=top&&i.y>=bottom : kind === 'hpz' ? i.x>=440&&i.y<=top&&i.y>=bottom : i.x>=430&&i.y<=top&&i.y>=bottom).filter(i=>/^\d[\d,]*(?:\.\d+)?$/.test(i.s)).map(i=>i.s).at(-1)??'';
      console.log(JSON.stringify({page:n,model:cur.s,description:desc,price})); count++;
    }
  }
  console.log(`COUNT ${count}`);
}
