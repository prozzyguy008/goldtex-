import { batchOneProducts } from './batch1-products';
import { batchTwoProducts } from './batch2-products';

export type Product = {
  id: string;
  brand: string | null;
  category: string;
  subcategory: string;
  model: string | null;
  name: string;
  description: string;
  specs: string[];
  cost: number | null;
  price: number | null;
  imageStatus: 'pending' | 'exact_verified' | 'same_product_verified';
  imageUrl?: string;
  featured?: boolean;
  sourceFile?: string;
  sourcePage?: number;
  stockStatus?: 'available' | 'on_request' | 'unknown';
};

const priced = (cost: number): number => Math.round(cost * 1.1);

export const products: Product[] = [
  { id: 'mw322sgb1', brand: 'Maxi', category: 'Televisions', subcategory: '32 inch', model: 'MW322SGB1', name: '32″ Smart LED Television', description: 'Frameless HD smart television with Bluetooth, screencast and LAN connectivity.', specs: ['32-inch LED display', 'Smart TV with Bluetooth', 'HDMI and USB inputs', 'RJ45 / LAN input'], cost: 144000, price: priced(144000), imageStatus: 'exact_verified', imageUrl: '/product-images/maxi-mw322sgb1.jpg', featured: true },
  { id: 'hisense-50a6n', brand: 'Hisense', category: 'Televisions', subcategory: '50 inch', model: '50A6N', name: '50″ UHD 4K Smart TV', description: 'UHD 4K smart television with Dolby Vision HDR and Game Mode Plus.', specs: ['50-inch UHD 4K', 'Dolby Vision HDR', '3 HDMI / 2 USB', 'Wi-Fi and LAN'], cost: 399000, price: priced(399000), imageStatus: 'exact_verified', imageUrl: '/product-images/hisense-50a6n.webp', featured: true },
  { id: 'lg-43lr6000', brand: 'LG', category: 'Televisions', subcategory: '43 inch', model: '43LR6000', name: '43″ Smart LED TV', description: 'Full HD LED television with smart features and built-in satellite receiver.', specs: ['43-inch LED display', 'Smart TV', 'Built-in satellite receiver', '3 HDMI / 3 USB'], cost: 335000, price: priced(335000), imageStatus: 'exact_verified', imageUrl: '/product-images/lg-43lr6000.jpg', featured: true },
  { id: 'mwfac1802', brand: 'Maxi', category: 'Air Conditioners', subcategory: 'Floor standing', model: 'FAC1802INV-HC', name: '18,000 BTU Inverter Floor AC', description: 'Inverter heating and cooling floor-standing air conditioner with Wi-Fi control.', specs: ['18,000 BTU', 'Inverter heating and cooling', 'R32 refrigerant', 'Remote and Wi-Fi control'], cost: 899000, price: priced(899000), imageStatus: 'pending', featured: true },
  { id: 'polystar-pv18tp41gm', brand: 'Polystar', category: 'Air Conditioners', subcategory: 'Split inverter', model: 'PV-18TP41GM', name: '2HP Inverter Split AC', description: 'Cooling-only inverter split air conditioner with copper installation pipes.', specs: ['2HP inverter', 'R410A refrigerant', '3m copper pipe kit', 'Remote control'], cost: 560000, price: priced(560000), imageStatus: 'exact_verified', imageUrl: '/product-images/polystar-pv18tp41gm.jpg' },
  { id: 'hisense-ref61wc', brand: 'Hisense', category: 'Refrigerators', subcategory: 'French door', model: '61WC-RQ', name: '482L Four-Door Inverter Refrigerator', description: 'Four-door silver refrigerator with dual-tech cooling and water dispenser.', specs: ['482 litre capacity', 'Four-door design', 'Inverter technology', 'Water dispenser'], cost: 1150000, price: priced(1150000), imageStatus: 'exact_verified', imageUrl: '/product-images/hisense-61wc-rq.png', featured: true },
  { id: 'maxi-6060-t840', brand: 'Maxi', category: 'Cookers', subcategory: 'Standing cooker', model: '6060 T-840', name: '60×60cm 4-Burner Gas Cooker', description: 'Four-burner tabletop and oven cooker with auto ignition in black.', specs: ['60×60cm format', '4 gas burners', 'Auto ignition', 'Black finish'], cost: 137000, price: priced(137000), imageStatus: 'exact_verified', imageUrl: '/product-images/maxi-6060-t840.jpg' },
  { id: 'mw-airf0860bk', brand: 'Maxi', category: 'Kitchen Appliances', subcategory: 'Air fryer', model: 'MW-AIRF0860BK', name: '8L Digital Air Fryer', description: 'Large-capacity digital air fryer with touch display and seven presets.', specs: ['8 litre capacity', '2000–2200W', 'Digital touch display', '50–200°C temperature range'], cost: 69900, price: priced(69900), imageStatus: 'pending', featured: true },
  { id: 'maxi-af85wa2cn', brand: 'Maxi', category: 'Kitchen Appliances', subcategory: 'Air fryer', model: 'AF85WA2CN', name: '8.5L Digital Air Fryer', description: 'Large black digital air fryer with removable drawer and LED display.', specs: ['8.5 litre capacity', 'Digital LED display', 'Removable drawer', '1500W class'], cost: 79000, price: priced(79000), imageStatus: 'exact_verified', imageUrl: '/product-images/maxi-af85wa2cn.webp' },
  { id: 'mw-mhf2001', brand: 'Maxi', category: 'Audio', subcategory: 'Hi-Fi systems', model: 'MWAUD-MHF2001', name: '1600W Bluetooth Hi-Fi System', description: 'Party-ready hi-fi system with LED lighting, Bluetooth, USB and FM.', specs: ['1600W PMPO', 'Bluetooth / USB / AUX / FM', 'Wireless remote control', 'Wired microphone included'], cost: 182000, price: priced(182000), imageStatus: 'exact_verified', imageUrl: '/product-images/mewe-mhf2001.png', featured: true },
  { id: 'hisense-aud110hp', brand: 'Hisense', category: 'Audio', subcategory: 'Party speakers', model: 'AUD 110HP', name: '300W Party Rocker Speaker', description: 'Portable party rocker with built-in battery, wireless charging and dual microphones.', specs: ['300W audio power', 'Built-in battery', 'Wireless charging', 'Dual wireless microphones'], cost: 295000, price: priced(295000), imageStatus: 'exact_verified', imageUrl: '/product-images/hisense-aud110hp.jpg' },
  { id: 'mw-pts1201db', brand: 'Maxi', category: 'Audio', subcategory: 'Party speakers', model: 'MWAUD-PTS1201DB', name: '1500W Double 12″ Party Speaker', description: 'High-output Bluetooth party speaker with LED display, microphone and remote.', specs: ['1500W PMPO', 'Dual 12-inch drivers', 'USB / TF / Bluetooth / FM', 'Wireless microphone included'], cost: 284000, price: priced(284000), imageStatus: 'exact_verified', imageUrl: '/product-images/mewe-pts1201db.webp', featured: true },
  { id: 'hisense-ble1000de', brand: 'Hisense', category: 'Kitchen Appliances', subcategory: 'Blenders', model: 'HISBLE1000DE-HB', name: '1.5L Inox Blender', description: 'High-power inox blender for everyday kitchen preparation.', specs: ['1.5 litre jar', '1000W motor', 'Inox finish', 'Blending and grinding'], cost: 74000, price: priced(74000), imageStatus: 'exact_verified', imageUrl: '/product-images/hisense-ble1000de.jpg' },
  { id: 'mwfan-esf1804', brand: 'Maxi', category: 'Fans', subcategory: 'Stand fans', model: 'MWFAN-ESF1804', name: '18″ Touch-Control Stand Fan', description: 'Full black mechanical stand fan with touch control and remote control.', specs: ['18-inch fan', '65W motor', 'Touch panel', 'Remote control'], cost: 39900, price: priced(39900), imageStatus: 'pending' },
  { id: 'polystar-pv56wc', brand: 'Polystar', category: 'Fans', subcategory: 'Ceiling fans', model: 'PV-56WC', name: '56″ Copper-Motor Ceiling Fan', description: 'White ceiling fan with copper motor, metal blades and five-speed regulator.', specs: ['56-inch span', '100% copper motor', '3 metal blades', '5-speed regulator'], cost: 23000, price: priced(23000), imageStatus: 'exact_verified', imageUrl: '/product-images/polystar-pv56wc.jpg' },
  { id: 'mwkca-oven2501', brand: 'Maxi', category: 'Kitchen Appliances', subcategory: 'Ovens', model: 'MWKCA-OVEN2501', name: '25L Electric Oven', description: 'Compact electric oven with temperature control, timer and multiple rack positions.', specs: ['25 litre capacity', '1400W', '100–230°C control', '60-minute timer'], cost: 49000, price: priced(49000), imageStatus: 'pending' },
  { id: 'polystar-pvmz19b', brand: 'Polystar', category: 'Kitchen Appliances', subcategory: 'Ice makers', model: 'PV-MZ19B', name: 'Countertop Ice Maker', description: 'Compact black ice maker with 2.2L tank and rapid cube production.', specs: ['2.2 litre water tank', '10–12kg ice per 24 hours', '6–13 minute cycle', '112W'], cost: 87000, price: priced(87000), imageStatus: 'exact_verified', imageUrl: '/product-images/polystar-pv-mz19b.png' },
  { id: 'maxi-gen-ek50', brand: 'Maxi', category: 'Power & Electrical', subcategory: 'Generators', model: 'MAXIGEN EK50', name: '5kW Key-Start Generator', description: 'Copper-wound petrol generator with battery start, wheels and handles.', specs: ['5kW / 6.2kVA', 'Petrol powered', 'Battery start', '25L fuel tank'], cost: 579000, price: priced(579000), imageStatus: 'exact_verified', imageUrl: '/product-images/maxi-gen-ek50.jpg' },
  ...batchOneProducts,
  ...batchTwoProducts,
];

export const categories = ['All products', ...Array.from(new Set(products.map((product) => product.category)))];
export const brands = ['All brands', ...Array.from(new Set(products.map((product) => product.brand).filter((brand): brand is string => Boolean(brand))))];
