import fs from 'node:fs';

function loadBatch(file) {
  const content = fs.readFileSync(file, 'utf8');
  const start = content.indexOf('Product[] = [') + 'Product[] = '.length;
  return JSON.parse(content.slice(start, content.lastIndexOf(']') + 1));
}

const b1 = loadBatch('src/data/batch1-products.ts');
const b2 = loadBatch('src/data/batch2-products.ts');
const all = [...b1, ...b2];

const titleCase = (s) => s.toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
const findInches = (t) => (t.match(/(\d+(?:\.\d+)?)\s*["″''’]+/) || [])[1];
const findBTU = (t) => { const m = t.match(/(\d[\d,]*)\s*btu/i); return m ? m[1].replace(/,/g, '') : null; };
const findHP = (t) => (t.match(/(\d+(?:\.\d+)?)\s*hp/i) || [])[1];
const findLitres = (t) => (t.match(/(\d+(?:\.\d+)?)\s*(?:l|ltr|litre|liter)s?\b/i) || [])[1];
const findKg = (t) => (t.match(/(\d+(?:\.\d+)?)\s*kg\b/i) || [])[1];
const findCm = (t) => (t.match(/(\d+(?:\.\d+)?)\s*cm\b/i) || [])[1];
const findWatts = (t) => { const m = t.match(/(\d[\d,]*)\s*w(?:att)?\b/i); return m ? m[1].replace(/,/g, '') : null; };
const findKVA = (t) => (t.match(/(\d+(?:\.\d+)?)\s*kva/i) || [])[1];
const findKW = (t) => (t.match(/(\d+(?:\.\d+)?)\s*kw\b/i) || [])[1];

// Junk entries from PDF contact info — not real products
const isJunk = (p) => {
  const t = `${p.name} ${p.model}`.toLowerCase();
  const nameTrim = (p.name || '').trim();
  return /^fouani nigeria|^view product|^e-mail:|^email:|^mobile:\s*\+|^website:|^ilorin@|^fate round|^address/i.test(nameTrim) ||
    /fouani nigeria|view product catalogue|e-mail:|mobile:\s*\+|website:\s*www|fate round about|umaru audi/i.test(t) ||
    (p.model && /^website:|^mobile:|^e-mail:|^fate round/i.test(p.model));
};

function cleanName(product) {
  const { name, description, model, brand, category } = product;
  const text = `${name} ${description}`.toLowerCase();
  const m = (model || '').toLowerCase();
  let cleaned = null;
  let needsReview = false;

  // --- Filter junk entries ---
  if (isJunk(product)) {
    return { cleanedName: '[Non-product entry — remove]', needsReview: true, isJunk: true };
  }

  // --- TELEVISIONS ---
  if (category === 'Televisions') {
    const inches = findInches(text);
    const isUHD = /uhd|4k/.test(text);
    const isFHD = /fhd|full hd|1080p/.test(text);
    const isHD = /\bhd\b/.test(text) && !isFHD && !isUHD;
    const isSmart = /smart/.test(text);
    const isQLED = /qled/.test(text);
    const isOLED = /oled/.test(text);
    const isULED = /uled/.test(text);
    const isMiniLED = /mini.?led/.test(text);
    const isArtMode = /art mode|canvas/.test(text);

    // TV stands misategorized as Televisions
    if (/tv\s*stand|safira|paladio|rubi|lazuli/.test(text) || /tvstand/i.test(m)) {
      cleaned = 'TV Stand';
    } else if (isArtMode) {
      cleaned = inches ? `${inches}" Art Mode QLED Smart TV` : 'Art Mode QLED Smart TV';
    } else {
      let p = '';
      if (inches) p += `${inches}" `;
      if (isMiniLED) p += 'Mini-LED ';
      else if (isQLED) p += 'QLED ';
      else if (isULED) p += 'ULED ';
      else if (isOLED) p += 'OLED ';
      if (isUHD) p += '4K ';
      else if (isFHD) p += 'Full HD ';
      else if (isHD) p += 'HD ';
      if (isSmart) p += 'Smart ';
      p += 'LED TV';
      cleaned = p.trim();
    }
  }

  // --- Hisense refrigerators in Kitchen Appliances ---
  else if (category === 'Kitchen Appliances' && brand === 'Hisense' && /ref|frost|fridge|freezer|refrigerator/i.test(text)) {
    const l = findLitres(text);
    if (/chest|freezer/.test(text)) cleaned = l ? `${l}L Chest Freezer` : 'Chest Freezer';
    else cleaned = l ? `${l}L Refrigerator` : 'Refrigerator';
  }

  // --- AIR CONDITIONERS ---
  else if (category === 'Air Conditioners') {
    const hp = findHP(text);
    const btu = findBTU(text);
    const isSplit = /split/.test(text);
    const isFloor = /floor\s*standing/.test(text);
    const isInverter = /inverter/.test(text);
    let base = 'Split AC';
    if (isFloor) base = 'Floor Standing AC';
    else if (!isSplit && /sac/i.test(m)) base = 'Split AC';
    cleaned = `${hp ? hp + 'HP ' : btu ? btu + ' BTU ' : ''}${isInverter ? 'Inverter ' : ''}${base}`.trim();
    if (!hp && !btu) cleaned = `${isInverter ? 'Inverter ' : ''}${base}`.trim();
  }

  // --- REFRIGERATION ---
  else if (category === 'Refrigeration') {
    const l = findLitres(text);
    if (/chest\s*freezer/.test(text)) cleaned = l ? `${l}L Chest Freezer` : 'Chest Freezer';
    else if (/water\s*dispenser/.test(text)) cleaned = 'Water Dispenser';
    else if (/showcase/.test(text)) cleaned = l ? `${l}L Showcase Fridge` : 'Showcase Fridge';
    else if (/side.?by.?side/.test(text)) cleaned = l ? `${l}L Side-by-Side Fridge` : 'Side-by-Side Fridge';
    else if (/double\s*door/.test(text)) cleaned = l ? `${l}L Double Door Fridge` : 'Double Door Fridge';
    else if (/single\s*door/.test(text)) cleaned = l ? `${l}L Single Door Fridge` : 'Single Door Fridge';
    else if (/table\s*top/.test(text)) cleaned = l ? `${l}L Table Top Fridge` : 'Table Top Fridge';
    else cleaned = l ? `${l}L Refrigerator` : 'Refrigerator';
  }

  // --- LAUNDRY ---
  else if (category === 'Laundry') {
    const kg = findKg(text);
    if (/dish\s*washer|dishwasher/.test(text)) cleaned = 'Dishwasher';
    else if (/dryer/.test(text) && !/wash/.test(text)) cleaned = 'Tumble Dryer';
    else {
      const isFront = /front\s*load/.test(text);
      const isTop = /top\s*load/.test(text);
      const isSingle = /single\s*tub/.test(text);
      const isInv = /inverter/.test(text);
      const isAuto = /automatic/.test(text);
      let type = 'Washing Machine';
      if (isFront) type = 'Front Load Washing Machine';
      else if (isTop) type = 'Top Load Washing Machine';
      else if (isSingle) type = 'Single Tub Washing Machine';
      cleaned = `${kg ? kg + 'kg ' : ''}${isInv ? 'Inverter ' : isAuto ? 'Automatic ' : ''}${type}`.trim();
    }
  }

  // --- AUDIO ---
  else if (category === 'Audio') {
    const w = findWatts(text);
    if (/sound.?bar/.test(text)) cleaned = w ? `${w}W Sound Bar` : 'Sound Bar';
    else if (/home\s*thea(t|tr)e/.test(text)) cleaned = w ? `${w}W Home Theatre System` : 'Home Theatre System';
    else if (/party|dj|karaoke/.test(text)) cleaned = w ? `${w}W Party Speaker` : 'Party Speaker';
    else if (/hifi|hi-fi|hi fi/.test(text)) cleaned = w ? `${w}W Hi-Fi System` : 'Hi-Fi System';
    else if (/bluetooth\s*speaker|portable\s*speaker|wireless\s*speaker/.test(text)) cleaned = w ? `${w}W Bluetooth Speaker` : 'Bluetooth Speaker';
    else if (/boombox/.test(text)) cleaned = 'Boombox';
    else if (/microphone|\bmic\b/.test(text)) cleaned = 'Microphone';
    else if (w) cleaned = `${w}W Speaker`;
    else cleaned = 'Speaker System';
  }

  // --- FANS ---
  else if (category === 'Fans') {
    const inches = (text.match(/(\d+(?:\.\d+)?)\s*(?:inch|")/i) || [])[1];
    const isCeiling = /ceiling/.test(text);
    const isStand = /stand|standing|pedestal/.test(text);
    const isWall = /wall/.test(text);
    const isTable = /table|desk/.test(text);
    const isRechargeable = /rechargeable/.test(text);
    const isIndustrial = /industrial/.test(text);
    let type = 'Fan';
    if (isCeiling) type = 'Ceiling Fan';
    else if (isStand) type = isIndustrial ? 'Industrial Stand Fan' : 'Stand Fan';
    else if (isWall) type = isIndustrial ? 'Industrial Wall Fan' : 'Wall Fan';
    else if (isTable) type = 'Table Fan';
    cleaned = `${inches ? inches + '" ' : ''}${isRechargeable ? 'Rechargeable ' : ''}${type}`.trim();
  }

  // --- KITCHEN APPLIANCES ---
  else if (category === 'Kitchen Appliances') {
    const cm = findCm(text);
    const l = findLitres(text);
    const w = findWatts(text);

    // Model-based first for MW products
    if (/mwiron/i.test(m)) {
      cleaned = w ? `${w}W Steam Iron` : 'Steam Iron';
    } else if (/mw-bur|mwees.*bur/i.test(m) || /rice\s*cooker|rice\s*pot/.test(text)) {
      cleaned = l ? `${l}L Rice Cooker` : 'Rice Cooker';
    } else if (/mw-ecs|ceramic\s*stove|ceramic\s*cook/.test(text)) {
      cleaned = 'Ceramic Electric Stove';
    } else if (/maximwo|maxi.*microwave/.test(m) || /microwave/.test(text)) {
      const isGrill = /grill/.test(text);
      const isInv = /inverter/.test(text);
      let t = 'Microwave Oven';
      if (isGrill) t = 'Microwave Oven with Grill';
      cleaned = `${l ? l + 'L ' : ''}${isInv ? 'Inverter ' : ''}${t}`.trim();
    } else if (/maxick.*induction|induction\s*cook/.test(text)) {
      cleaned = 'Induction Cooker';
    } else if (/maxick.*pressure|pressure\s*cook/.test(text)) {
      cleaned = 'Electric Pressure Cooker';
    } else if (/maxick.*rice|rice\s*cook/.test(text)) {
      cleaned = l ? `${l}L Rice Cooker` : 'Rice Cooker';
    } else if (/maximixer|hand\s*mixer|kitchen\s*mixer/.test(text)) {
      cleaned = w ? `${w}W Hand Mixer` : 'Hand Mixer';
    } else if (/maxible|nutriboom|blender.*extractor/.test(text)) {
      cleaned = w ? `${w}W Blender` : 'Blender';
    } else if (/cooker\s*hood|rangehood|range\s*hood/.test(text)) {
      const isInv = /inverter/.test(text);
      cleaned = cm ? `${cm}cm ${isInv ? 'Inverter ' : ''}Cooker Hood` : 'Cooker Hood';
    } else if (/hob|gas\s*hub|gashub|gas\s*burner|electric\s*burner/.test(text) && !/cooker|oven|microwave|standing/.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas)/i) || [])[1];
      const isBuiltIn = /built.?in/.test(text);
      cleaned = burners ? `${burners}-Burner ${isBuiltIn ? 'Built-in Hob' : 'Gas Hob'}` : 'Gas Hob';
    } else if (/standing\s*cooker|stand\s*cooker|std/.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:burner|brass|gas)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Standing Cooker` : 'Standing Cooker';
    } else if (/table\s*(?:top)?\s*(?:cooker|gas)/.test(text) && !/standing/.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Table Top Cooker` : 'Table Top Cooker';
    } else if (/maxist|maxi.*stove/.test(m) || /stove/.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Table Top Cooker` : 'Table Top Cooker';
    } else if (/maxi60x90|maxi.*60.*90/.test(m)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas|pool|sabaf)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Standing Cooker` : 'Standing Cooker';
    } else if (/maxiburner/.test(m)) {
      cleaned = 'Built-in Burner & Hood';
    } else if (/maxioven/.test(m) || /\boven\b/.test(text) && !/microwave/.test(text) && !/standing/.test(text)) {
      const isBuiltIn = /built.?in/.test(text);
      cleaned = l ? `${l}L ${isBuiltIn ? 'Built-in Electric Oven' : 'Electric Oven'}` : 'Electric Oven';
    } else if (/air\s*fryer|airf/.test(text)) {
      cleaned = l ? `${l}L Air Fryer` : 'Air Fryer';
    } else if (/blender|bld|hsb|grinder/.test(text) || /bld|hsb|grinder/.test(m)) {
      if (/grinder|hsb/.test(text) || /hsb|grinder/.test(m)) cleaned = w ? `${w}W Grinder & Blender` : 'Grinder & Blender';
      else cleaned = w ? `${w}W Blender` : 'Blender';
    } else if (/bgm/.test(m)) {
      cleaned = w ? `${w}W Grinder & Blender` : 'Grinder & Blender';
    } else if (/kettle/.test(text) || /kettle/.test(m)) {
      cleaned = l ? `${l}L Electric Kettle` : 'Electric Kettle';
    } else if (/toaster/.test(text)) {
      cleaned = 'Toaster';
    } else if (/contact\s*grill|grill/.test(text) && !/cooker|oven/.test(text)) {
      cleaned = 'Electric Grill';
    } else if (/sandwich/.test(text)) {
      cleaned = 'Sandwich Maker';
    } else if (/pressure\s*cooker/.test(text)) {
      cleaned = 'Electric Pressure Cooker';
    } else if (/\biron\b/.test(text)) {
      cleaned = w ? `${w}W Steam Iron` : 'Steam Iron';
    } else if (/juic/.test(text)) {
      cleaned = 'Juicer';
    } else if (/mixer/.test(text)) {
      cleaned = 'Mixer';
    } else if (/processor/.test(text)) {
      cleaned = 'Food Processor';
    } else {
      needsReview = true;
    }
  }

  // --- POWER & ELECTRICAL ---
  else if (category === 'Power & Electrical') {
    const w = findWatts(text);
    const kva = findKVA(text);
    const kw = findKW(text);
    const l = findLitres(text);

    if (/generator|gen\b|maxigen/.test(text) || /maxigen|gen/.test(m)) {
      const isKey = /key\s*start|key\s*starter|battery\s*start/.test(text);
      const isManual = /manual|recoil|pull/.test(text);
      cleaned = `${kw ? kw + 'kW ' : kva ? kva + 'kVA ' : ''}${isKey ? 'Key-Start Generator' : isManual ? 'Manual-Start Generator' : 'Generator'}`.trim();
    } else if (/stabiliz|stabilis|voltage.*regulat|regulator|mwees.*vst|mwees.*avp/i.test(text) || /vst|avp/i.test(m)) {
      cleaned = kva ? `${kva}kVA Voltage Stabilizer` : w ? `${w}W Voltage Stabilizer` : 'Voltage Stabilizer';
    } else if (/maxiups|\bups\b/i.test(text) || /ups/i.test(m)) {
      cleaned = kva ? `${kva}kVA UPS` : 'UPS';
    } else if (/extension|power\s*strip|surge|maxiext/i.test(text) || /ext/i.test(m)) {
      const outlets = (text.match(/(\d+)\s*outlet/i) || [])[1];
      cleaned = outlets ? `${outlets}-Outlet Extension Cord` : 'Extension Cord';
    } else if (/bracket|mount/i.test(text) || /bracket/i.test(m)) {
      cleaned = 'AC Wall Mount Bracket';
    } else if (/solar|ems|slp|fdl/i.test(text) || /ems|slp|fdl/i.test(m)) {
      if (/solar|fdl/i.test(text) || /fdl/i.test(m)) cleaned = w ? `${w}W Solar Flood Light` : 'Solar Flood Light';
      else if (/slp/i.test(m)) cleaned = w ? `${w}W Solar Light` : 'Solar Light';
      else if (/ems/i.test(m)) cleaned = 'Emergency Light';
      else cleaned = w ? `${w}W Solar Light` : 'Solar Light';
    } else if (/swatter|mosquito|killer|insect/i.test(text)) {
      cleaned = 'Mosquito Swatter';
    } else if (/ceramic\s*stove|ecs/i.test(text) || /ecs/i.test(m)) {
      cleaned = 'Ceramic Electric Stove';
    } else if (/installation\s*kit|install.*kit/i.test(text) || /install/i.test(m)) {
      const hp = findHP(text);
      cleaned = hp ? `${hp}HP AC Installation Kit` : 'AC Installation Kit';
    } else if (/water\s*heater|wh$/i.test(text)) {
      cleaned = l ? `${l}L Water Heater` : 'Water Heater';
    } else if (/grinder|hsb|bld/i.test(m)) {
      cleaned = w ? `${w}W Grinder & Blender` : 'Grinder & Blender';
    } else if (/blender|bld/i.test(text)) {
      cleaned = w ? `${w}W Blender` : 'Blender';
    } else if (/air\s*fryer|airf/i.test(text) || /airf/i.test(m)) {
      cleaned = l ? `${l}L Air Fryer` : 'Air Fryer';
    } else {
      needsReview = true;
    }
  }

  // --- LIGHTING ---
  else if (category === 'Lighting') {
    const w = findWatts(text);
    if (/flood/.test(text)) cleaned = w ? `${w}W Flood Light` : 'Flood Light';
    else if (/solar/.test(text)) cleaned = w ? `${w}W Solar Light` : 'Solar Light';
    else if (/bulb|lamp|led\s*lamp/.test(text)) cleaned = 'LED Bulb';
    else cleaned = 'Lighting';
  }

  // --- ACCESSORIES ---
  else if (category === 'Accessories') {
    if (/tv\s*stand|mobile\s*base/.test(text)) {
      const inches = findInches(text);
      cleaned = inches ? `${inches}" TV Stand` : 'TV Stand';
    } else if (/wall\s*mount/.test(text)) cleaned = 'Wall Mount Bracket';
    else cleaned = 'Accessory';
  }

  // --- MOBILE & ACCESSORIES ---
  else if (category === 'Mobile & Accessories') {
    if (/phone|xiaomi|tecno|vivo/.test(text)) cleaned = 'Smartphone';
    else if (/charger|adapter/.test(text)) cleaned = 'Charger';
    else if (/headphone|earphone|earbud/.test(text)) cleaned = 'Headphones';
    else if (/mouse/.test(text)) cleaned = 'Mouse';
    else if (/watch/.test(text)) cleaned = 'Smartwatch';
    else if (/memory|sd\s*card/.test(text)) cleaned = 'Memory Card';
    else cleaned = 'Mobile Accessory';
  }

  // --- LG Appliances ---
  else if (category === 'LG Appliances') {
    const inches = findInches(text);
    const w = findWatts(text);
    const l = findLitres(text);
    const kg = findKg(text);

    if (/tv\b|television|oled|qled|uhd|nano|vidaa|led\s*tv/i.test(text) || /^tv/i.test(m)) {
      const isSmart = /smart/.test(text);
      const isOLED = /oled/.test(text);
      const isQLED = /qled/.test(text);
      const isNano = /nano/.test(text);
      const isUHD = /uhd|4k/.test(text);
      let p = '';
      if (inches) p += `${inches}" `;
      if (isOLED) p += 'OLED ';
      else if (isQLED) p += 'QLED ';
      else if (isNano) p += 'NanoCell ';
      if (isUHD) p += '4K ';
      if (isSmart) p += 'Smart ';
      cleaned = (p + 'TV').trim();
    } else if (/ref|fridge|refrigerator|frost/i.test(text) || /^ref/i.test(m)) {
      cleaned = l ? `${l}L Refrigerator` : 'Refrigerator';
    } else if (/wash|washer|dryer|front\s*load|top\s*load|wm\s*\d/i.test(text) || /^wm|^wd|^dw|^lgwm/i.test(m)) {
      if (/dish/i.test(text) || /^dw/i.test(m)) cleaned = 'Dishwasher';
      else if (/front\s*load/i.test(text)) cleaned = kg ? `${kg}kg Front Load Washing Machine` : 'Front Load Washing Machine';
      else if (/top\s*load/i.test(text)) cleaned = kg ? `${kg}kg Top Load Washing Machine` : 'Top Load Washing Machine';
      else cleaned = kg ? `${kg}kg Washing Machine` : 'Washing Machine';
    } else if (/microwave|mwo/i.test(text) || /mwo/i.test(m)) {
      cleaned = l ? `${l}L Microwave Oven` : 'Microwave Oven';
    } else if (/speaker|audio|home\s*thea|sound|woofer|party|dj|karaoke|boombox|portable|mobility|wireless|battery/i.test(text) || /^aud/i.test(m)) {
      const isSoundBar = /sound.?bar/.test(text);
      const isParty = /party|dj|karaoke/.test(text);
      const isPortable = /portable|mobility|wireless|built-in battery|battery/.test(text);
      if (isSoundBar) cleaned = w ? `${w}W Sound Bar` : 'Sound Bar';
      else if (isParty) cleaned = w ? `${w}W Party Speaker` : 'Party Speaker';
      else if (isPortable) cleaned = w ? `${w}W Portable Speaker` : 'Portable Speaker';
      else cleaned = w ? `${w}W Speaker` : 'Speaker';
    } else if (/cook|stove|hob|burner/i.test(text)) {
      cleaned = 'Cooker';
    } else if (/fan|ceiling\s*conc|cassette/i.test(text) || /^ceiling|^cassette/i.test(m)) {
      const hp = findHP(text);
      if (/cassette/i.test(text) || /cassette/i.test(m)) cleaned = hp ? `${hp}HP Cassette AC` : 'Cassette AC';
      else if (/ceiling/i.test(text) || /ceiling/i.test(m)) cleaned = hp ? `${hp}HP Ceiling AC` : 'Ceiling AC';
      else cleaned = 'Fan';
    } else if (/spl|split|floor\s*stand|fs\s*\d/i.test(text) || /^spl|^fs/i.test(m)) {
      const hp = findHP(text) || (m.match(/(\d+(?:\.\d+)?)\s*hp/) || [])[1];
      const isInv = /inverter|inv/i.test(text) || /inv/i.test(m);
      const isFloor = /floor|fs/i.test(text) || /^fs/i.test(m);
      const isArtCool = /art.?cool/i.test(text);
      const isGenCool = /gen.?cool/i.test(text);
      let type = isFloor ? 'Floor Standing AC' : 'Split AC';
      if (isArtCool) type = 'Art Cool ' + type;
      else if (isGenCool) type = 'Gen Cool ' + type;
      cleaned = `${hp ? hp + 'HP ' : ''}${isInv ? 'Inverter ' : ''}${type}`.trim();
    } else {
      // Try model-based for LG
      if (/^aud|^lgaud/i.test(m)) cleaned = 'Speaker';
      else if (/^tv|^lgtv/i.test(m)) cleaned = inches ? `${inches}" Smart TV` : 'Smart TV';
      else if (/^ref/i.test(m)) cleaned = 'Refrigerator';
      else if (/^wm|^wd|^dw|^lgwm/i.test(m)) cleaned = 'Washing Machine';
      else if (/^mwo/i.test(m)) cleaned = 'Microwave Oven';
      else if (/^spl|^fs/i.test(m)) {
        const hp2 = (m.match(/(\d+(?:\.\d+)?)\s*hp/) || [])[1];
        const isInv2 = /inv/i.test(m);
        const isFloor2 = /^fs/i.test(m);
        cleaned = `${hp2 ? hp2 + 'HP ' : ''}${isInv2 ? 'Inverter ' : ''}${isFloor2 ? 'Floor Standing AC' : 'Split AC'}`.trim();
      }
      else if (/ceiling/i.test(m)) {
        const hp3 = (m.match(/(\d+(?:\.\d+)?)\s*hp/) || [])[1] || (m.match(/(\d+)/) || [])[1];
        cleaned = hp3 ? `${hp3}HP Ceiling AC` : 'Ceiling AC';
      }
      else needsReview = true;
    }
  }

  // --- TEC brand ---
  else if (brand === 'TEC') {
    if (/ckr.*std|standing.*cooker/.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:hob|burner)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Standing Cooker` : 'Standing Cooker';
    } else if (/ckr.*tbl|table.*cooker/.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:hob|burner)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Table Top Cooker` : 'Table Top Cooker';
    } else if (/gen.*ptr|generator/i.test(text)) {
      const kva = findKVA(text);
      const kw = findKW(text);
      cleaned = kva ? `${kva}kVA Generator` : kw ? `${kw}kW Generator` : 'Generator';
    } else if (/stab/i.test(text)) {
      const kva = findKVA(text);
      cleaned = kva ? `${kva}kVA Stabilizer` : 'Stabilizer';
    } else {
      needsReview = true;
    }
  }

  // --- Other Electronics ---
  else if (category === 'Other Electronics') {
    const cm = findCm(text);
    const l = findLitres(text);
    const w = findWatts(text);
    const inches = findInches(text);

    // Model-based first
    if (/mwiron/i.test(m)) cleaned = w ? `${w}W Steam Iron` : 'Steam Iron';
    else if (/mw-bur/i.test(m)) cleaned = l ? `${l}L Rice Cooker` : 'Rice Cooker';
    else if (/mwbgm/i.test(m)) cleaned = w ? `${w}W Grinder & Blender` : 'Grinder & Blender';
    else if (/mwbld|hsb/i.test(m)) cleaned = w ? `${w}W Grinder & Blender` : 'Grinder & Blender';
    else if (/mwacm.*sac/i.test(m)) cleaned = 'Split AC';
    else if (/mwacm/i.test(m)) cleaned = 'Air Conditioner';
    else if (/mwaud|mic/i.test(m)) cleaned = 'Speaker System';
    else if (/mwfan/i.test(m)) cleaned = 'Fan';
    else if (/airf/i.test(m)) cleaned = l ? `${l}L Air Fryer` : 'Air Fryer';
    else if (/kettle/i.test(m)) cleaned = 'Electric Kettle';
    else if (/oven/i.test(m)) cleaned = 'Electric Oven';
    else if (/maxiwd|maxi.*water.*disp/i.test(m) || /water\s*dispenser|faucet|tap/i.test(text)) cleaned = 'Water Dispenser';
    else if (/maxi60x90|maxi.*60.*90/i.test(m)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas|pool|sabaf)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Standing Cooker` : 'Standing Cooker';
    } else if (/maxist/i.test(m)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Table Top Cooker` : 'Table Top Cooker';
    } else if (/maxiburner/i.test(m)) cleaned = 'Built-in Burner & Hood';
    else if (/maxioven/i.test(m)) cleaned = 'Electric Oven';
    else if (/maxiext/i.test(m)) cleaned = 'Extension Cord';
    else if (/maxigen.*\d.*kw|gen\d.*kw/i.test(m)) {
      const kw2 = (m.match(/(\d+(?:\.\d+)?)\s*kw/) || [])[1];
      cleaned = kw2 ? `${kw2}kW Generator` : 'Generator';
    }
    else if (/maxitvstand|tvstand/i.test(m)) cleaned = 'TV Stand';
    else if (/pvkl|solar|mwll-fdl|ems|slp/i.test(m)) {
      if (/fdl/i.test(m)) cleaned = w ? `${w}W Solar Flood Light` : 'Solar Flood Light';
      else if (/slp/i.test(m)) cleaned = w ? `${w}W Solar Light` : 'Solar Light';
      else if (/ems/i.test(m)) cleaned = 'Emergency Light';
      else cleaned = w ? `${w}W Solar Light` : 'Solar Light';
    }
    else if (/bracket|mount/i.test(m)) cleaned = 'Wall Mount Bracket';
    else if (/maxitoa/i.test(m) || /defrost.*reheat|toast/i.test(text)) cleaned = 'Toaster Oven';
    else if (/maxidh/i.test(m) || /dehumidif/i.test(text)) cleaned = l ? `${l}L Dehumidifier` : 'Dehumidifier';
    else if (/maxick/i.test(m) && /induction/i.test(text)) cleaned = 'Induction Cooker';
    // Hisense TV models (HISTV*, TV*, TV65*, etc.) — check BEFORE HPZ block
    else if (brand === 'Hisense' && (/^histv|^tv\d|tv\s*\d/i.test(m) || /\btv\b.*uled|\btv\b.*qled|\btv\b.*oled|uled.*tv|qled.*tv/i.test(text))) {
      const inches2 = findInches(text) || (m.match(/(\d{2,3})/) || [])[1];
      const isUHD2 = /uhd|4k|uled|qled|mini.?led/i.test(text);
      const isSmart2 = /smart|ai\s*tv|vidaa/i.test(text);
      let p2 = '';
      if (inches2) p2 += `${inches2}" `;
      if (/mini.?led/i.test(text)) p2 += 'Mini-LED ';
      else if (/qled/i.test(text)) p2 += 'QLED ';
      else if (/uled/i.test(text)) p2 += 'ULED ';
      if (isUHD2) p2 += '4K ';
      if (isSmart2) p2 += 'Smart ';
      p2 += 'TV';
      cleaned = p2.trim();
    }
    // Hisense washing machines
    else if (brand === 'Hisense' && /wm\s|wash|washer|front.*load|top.*load|fl.*kg/i.test(text)) {
      const kg2 = findKg(text);
      const isFront = /front|fl\b/i.test(text);
      cleaned = kg2 ? `${kg2}kg ${isFront ? 'Front Load ' : ''}Washing Machine` : 'Washing Machine';
    }
    // Hisense HPZ products with 100xxxxxxx model numbers
    else if (/^100\d{6}$/.test(model || '') || (brand === 'Hisense' && !/^tv\s|histv|led|uhd|oled|qled|smart|32\"|43\"|50\"|55\"|58\"|65\"|75\"|85\"|100\"|110\"|116\"/i.test(text))) {
      if (/ref.*1door|ref.*sxs|ref.*double|ref.*single|ref.*tmount|hrf-|hr-|ref\s/i.test(text)) {
        const l2 = findLitres(text) || (text.match(/(\d{3})\s*l/i) || [])[1];
        const isSxS = /sxs|side/i.test(text);
        const isTmount = /tmount|table.*top|tmnt/i.test(text);
        const isDouble = /2door|double/i.test(text);
        let type = 'Refrigerator';
        if (isSxS) type = 'Side-by-Side Fridge';
        else if (isTmount && isDouble) type = 'Table Top Fridge';
        else if (isDouble) type = 'Double Door Fridge';
        cleaned = l2 ? `${l2}L ${type}` : type;
      }
      else if (/mwo|microwave/i.test(text)) cleaned = l ? `${l}L Microwave Oven` : 'Microwave Oven';
      else if (/hp.*dc.*inverter|split.*ac/i.test(text)) {
        const hp4 = findHP(text) || (text.match(/(\d+(?:\.\d+)?)\s*hp/) || [])[1];
        cleaned = hp4 ? `${hp4}HP Inverter Split AC` : 'Split AC';
      }
      else if (/chest|freezer/i.test(text)) cleaned = l ? `${l}L Chest Freezer` : 'Chest Freezer';
      else if (/wm|wash|washer|front.*load|top.*load/i.test(text)) {
        const kg2 = findKg(text);
        cleaned = kg2 ? `${kg2}kg Washing Machine` : 'Washing Machine';
      }
      else if (/tv\b|led.*tv|uhd|oled|qled|smart.*tv/i.test(text)) {
        cleaned = inches ? `${inches}" Smart TV` : 'Smart TV';
      }
      else { needsReview = true; }
    }
    // Null-brand products
    else if (!brand) {
      if (/wifi.*booster/i.test(text)) cleaned = 'WiFi Booster';
      else if (/tablet|vistab/i.test(text)) cleaned = 'Tablet';
      else if (/zealot/i.test(text)) cleaned = 'Bluetooth Speaker';
      else if (/toshiba/i.test(text)) cleaned = 'Laptop Battery';
      else if (/vi04/i.test(text)) cleaned = 'Laptop Battery';
      else if (/yxli.*tablet.*stand/i.test(text)) cleaned = 'Tablet Stand';
      else if (/histv/i.test(m)) {
        const inches3 = findInches(text) || (m.match(/(\d{2,3})/) || [])[1];
        cleaned = inches3 ? `${inches3}" Smart TV` : 'Smart TV';
      }
      else if (/tv\d|tv\s*\d/i.test(m)) {
        const inches3 = findInches(text) || (m.match(/(\d{2,3})/) || [])[1];
        cleaned = inches3 ? `${inches3}" Smart TV` : 'Smart TV';
      }
      else if (/speaker|sound/i.test(text)) cleaned = 'Speaker';
      else { needsReview = true; }
    }
    // Polystar TV models with model-only names (PV-HK*, PV-TG*, etc.)
    else if (/^pv-[hk]|^pv-tg/i.test(m) && !/sac|hob|hood|burner|oven|kettle|iron|fan|blender|fryer|cooker|gas|water|solar|lamp|bracket|extension|swatter|sandwich|microwave|juice|mixer|grill|toaster|cs|swb|cf|dd|twf|wdw|lp|jy|hb|td|ny|kl|r6/i.test(m)) {
      cleaned = inches ? `${inches}" LED TV` : 'LED TV';
    }
    // Also handle PV-HK models (Polystar TVs) in Other Electronics
    else if (/pv-hk|pv-h/i.test(m) && /tv|led|uhd|hd|smart/i.test(text)) {
      cleaned = inches ? `${inches}" LED TV` : 'LED TV';
    }
    else if (/pv-swb|sandwich/i.test(m) || /sandwich/i.test(text)) cleaned = 'Sandwich Maker';
    else if (/pv-cs|interior.*lamp|ceiling/i.test(m) || /interior\s*lamp|ceiling\s*lamp|ceiling\s*light/i.test(text)) cleaned = 'Ceiling Light';
    else if (/3tap|3\s*tap|water\s*dispenser|faucet|tap/i.test(text)) cleaned = 'Water Dispenser';
    else if (/glass.*stainless|^glass$|2\s*burner.*electric|3\s*gas\s*burner|5\s*gas\s*burner/i.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Cooker` : 'Cooker';
    }
    // Text-based
    else if (/cooker\s*hood|rangehood/i.test(text)) cleaned = cm ? `${cm}cm Cooker Hood` : 'Cooker Hood';
    else if (/hob|gashub|gas\s*hub/i.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Gas Hob` : 'Gas Hob';
    } else if (/standing\s*cooker/.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas|pool|sabaf)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Standing Cooker` : 'Standing Cooker';
    } else if (/table.*cooker|table.*gas/i.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Table Top Cooker` : 'Table Top Cooker';
    } else if (/extension|power\s*strip|surge/i.test(text)) cleaned = 'Extension Cord';
    else if (/bracket|mount/i.test(text)) {
      cleaned = inches ? `${inches}" Wall Mount Bracket` : 'Wall Mount Bracket';
    } else if (/water\s*heater/i.test(text)) {
      cleaned = l ? `${l}L Water Heater` : 'Water Heater';
    } else if (/water\s*dispenser|faucet|tap/i.test(text)) cleaned = 'Water Dispenser';
    else if (/solar\s*light|solar\s*lamp/i.test(text)) cleaned = w ? `${w}W Solar Light` : 'Solar Light';
    else if (/flood\s*light/i.test(text)) cleaned = w ? `${w}W Flood Light` : 'Flood Light';
    else if (/ceiling\s*lamp|interior\s*lamp|ceiling\s*light/i.test(text)) cleaned = 'Ceiling Light';
    else if (/microphone|\bmic\b/i.test(text)) cleaned = 'Microphone';
    else if (/split\s*ac|btu|floor\s*standing/i.test(text)) {
      const hp = findHP(text);
      const btu = findBTU(text);
      const isInv = /inverter/i.test(text);
      const isFloor = /floor/i.test(text);
      cleaned = `${hp ? hp + 'HP ' : btu ? btu + ' BTU ' : ''}${isInv ? 'Inverter ' : ''}${isFloor ? 'Floor Standing AC' : 'Split AC'}`.trim();
    } else if (/\btv\b|television|led\s*tv/i.test(text)) {
      cleaned = inches ? `${inches}" LED TV` : 'LED TV';
    } else if (/induction\s*cook/i.test(text)) cleaned = 'Induction Cooker';
    else if (/rice\s*cook/i.test(text)) cleaned = l ? `${l}L Rice Cooker` : 'Rice Cooker';
    else if (/pressure\s*cook/i.test(text)) cleaned = 'Electric Pressure Cooker';
    else if (/ceramic\s*stove|ecs/i.test(text)) cleaned = 'Ceramic Electric Stove';
    else if (/air\s*fryer/i.test(text)) cleaned = l ? `${l}L Air Fryer` : 'Air Fryer';
    else if (/blender|bld/i.test(text)) cleaned = w ? `${w}W Blender` : 'Blender';
    else if (/grinder|hsb/i.test(text)) cleaned = w ? `${w}W Grinder & Blender` : 'Grinder & Blender';
    else if (/kettle/i.test(text)) cleaned = l ? `${l}L Electric Kettle` : 'Electric Kettle';
    else if (/\biron\b/i.test(text)) cleaned = w ? `${w}W Steam Iron` : 'Steam Iron';
    else if (/dish\s*washer/i.test(text)) cleaned = 'Dishwasher';
    else if (/tv\s*stand/i.test(text)) cleaned = 'TV Stand';
    else if (/burner/i.test(text)) {
      const burners = (text.match(/(\d+)\s*(?:burner|gas)/i) || [])[1];
      cleaned = burners ? `${burners}-Burner Cooker` : 'Cooker';
    } else if (/microwave/i.test(text)) cleaned = l ? `${l}L Microwave Oven` : 'Microwave Oven';
    else {
      needsReview = true;
    }
  }

  // Fallback
  if (!cleaned) {
    const firstPhrase = name.split(/[,;.•·|]+/)[0].trim();
    if (firstPhrase.length <= 50 && firstPhrase.length >= 3) {
      cleaned = titleCase(firstPhrase);
    } else {
      needsReview = true;
      cleaned = name.length > 50 ? titleCase(name.slice(0, 45)).trim() : titleCase(name);
    }
  }

  // Cleanup
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^price\s*list.*?\d{4}\s*/i, '');

  // Length check
  if (cleaned.length > 55) {
    const short = cleaned.split(/\s+/).slice(0, 5).join(' ');
    if (short.length <= 55) cleaned = short;
    else { needsReview = true; cleaned = short; }
  }

  return { cleanedName: cleaned, needsReview, isJunk: false };
}

// Process
let corrected = 0, unchanged = 0, reviewNeeded = 0, junkCount = 0;
const reviewList = [];

function processBatch(products) {
  return products.map((p) => {
    const original = p.name;
    const { cleanedName, needsReview, isJunk } = cleanName(p);

    if (isJunk) {
      junkCount++;
      reviewList.push({ id: p.id, originalName: original, cleanedName, model: p.model, brand: p.brand, category: p.category, reason: 'junk' });
      return { ...p, name: cleanedName };
    }
    if (needsReview) {
      reviewNeeded++;
      reviewList.push({ id: p.id, originalName: original, cleanedName, model: p.model, brand: p.brand, category: p.category });
    }
    if (cleanedName.toLowerCase() !== original.toLowerCase()) corrected++;
    else unchanged++;
    return { ...p, name: cleanedName };
  });
}

const updatedB1 = processBatch(b1);
const updatedB2 = processBatch(b2);

function writeBatch(file, products, exportName) {
  fs.writeFileSync(file, `import type { Product } from './products';\n\nexport const ${exportName}: Product[] = ${JSON.stringify(products, null, 2)};\n`);
}

writeBatch('src/data/batch1-products.ts', updatedB1, 'batchOneProducts');
writeBatch('src/data/batch2-products.ts', updatedB2, 'batchTwoProducts');

fs.writeFileSync('data/name-cleaning-report.json', JSON.stringify(reviewList, null, 2));

console.log(JSON.stringify({
  totalProducts: all.length,
  namesCorrected: corrected,
  namesUnchanged: unchanged,
  needsManualReview: reviewNeeded,
  junkEntries: junkCount,
}, null, 2));
