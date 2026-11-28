/**
 * Local labels for the Inventory screen (src/i18n is owned by the voice side).
 * Local language first; product words people already say in English stay English.
 */
import type { Lang, Unit } from '../../contracts/types';

const mr = {
  title: 'Stock',
  productsCount: (n: number) => `${n} products`,
  search: 'Product शोधा (उदा. पारले, Maggi)',
  all: 'सर्व',
  low: 'कमी stock',
  expiring: (d: number) => (d < 0 ? 'Expire झाले' : d === 0 ? 'आज expiry' : `Expiry ${d} दिवस`),
  ok: 'ठीक',
  noMatch: 'शोधानुसार कोणताही product सापडला नाही',
  clearSearch: 'शोध काढा',
  noProducts: 'अजून कोणताही product नाही',
  noProductsHint: 'खालील बटणाने पहिला product जोडा',
  addProduct: 'नवीन product जोडा',
  added: (name: string) => `${name} जोडले`,
  // form
  name: 'नाव',
  unit: 'Unit',
  openingQty: 'आत्ताचा stock',
  minStock: 'Minimum stock',
  minStockHint: 'यापेक्षा कमी झाल्यावर alert',
  category: 'Category',
  costPrice: 'खरेदी किंमत ₹',
  sellPrice: 'विक्री किंमत ₹',
  expiryDate: 'Expiry date',
  aliases: 'इतर नावे',
  aliasesHint: 'स्वल्पविरामाने वेगळी करा, उदा. पारले, parle',
  optional: 'ऐच्छिक',
  save: 'Save करा',
  cancel: 'रद्द करा',
  errRequired: 'हे भरा',
  errWhole: '0 किंवा जास्त पूर्ण संख्या लिहा',
  errPrice: 'किंमत 0 पेक्षा जास्त हवी',
  errDate: 'योग्य तारीख निवडा',
  errPastDate: 'Expiry date मागची असू शकत नाही',
  // reset
  resetDemo: 'Demo data reset करा',
  resetTitle: 'Demo data reset करायचा?',
  resetBody: 'सर्व विक्री, नवीन stock आणि orders पुसले जातील. Demo चा मूळ stock परत येईल.',
  resetConfirm: 'हो, reset करा',
  resetDone: 'Demo data reset झाला',
};

type Labels = typeof mr;

const hi: Labels = {
  title: 'Stock',
  productsCount: (n) => `${n} products`,
  search: 'Product खोजें (जैसे पारले, Maggi)',
  all: 'सभी',
  low: 'कम stock',
  expiring: (d) => (d < 0 ? 'Expire हो गया' : d === 0 ? 'आज expiry' : `Expiry ${d} दिन`),
  ok: 'ठीक',
  noMatch: 'खोज से कोई product नहीं मिला',
  clearSearch: 'खोज हटाएँ',
  noProducts: 'अभी कोई product नहीं है',
  noProductsHint: 'नीचे के बटन से पहला product जोड़ें',
  addProduct: 'नया product जोड़ें',
  added: (name) => `${name} जोड़ा गया`,
  name: 'नाम',
  unit: 'Unit',
  openingQty: 'अभी का stock',
  minStock: 'Minimum stock',
  minStockHint: 'इससे कम होने पर alert',
  category: 'Category',
  costPrice: 'खरीद कीमत ₹',
  sellPrice: 'बिक्री कीमत ₹',
  expiryDate: 'Expiry date',
  aliases: 'दूसरे नाम',
  aliasesHint: 'comma से अलग करें, जैसे पारले, parle',
  optional: 'वैकल्पिक',
  save: 'Save करें',
  cancel: 'रद्द करें',
  errRequired: 'यह भरें',
  errWhole: '0 या उससे ज़्यादा पूरी संख्या लिखें',
  errPrice: 'कीमत 0 से ज़्यादा होनी चाहिए',
  errDate: 'सही तारीख चुनें',
  errPastDate: 'Expiry date पिछली नहीं हो सकती',
  resetDemo: 'Demo data reset करें',
  resetTitle: 'Demo data reset करना है?',
  resetBody: 'सारी बिक्री, नया stock और orders मिट जाएँगे. Demo का असली stock वापस आ जाएगा.',
  resetConfirm: 'हाँ, reset करें',
  resetDone: 'Demo data reset हो गया',
};

const hinglish: Labels = {
  title: 'Stock',
  productsCount: (n) => `${n} products`,
  search: 'Product search karein (jaise Parle, Maggi)',
  all: 'Sab',
  low: 'Low stock',
  expiring: (d) => (d < 0 ? 'Expired' : d === 0 ? 'Aaj expiry' : `Expiry ${d} din`),
  ok: 'OK',
  noMatch: 'Search se koi product nahi mila',
  clearSearch: 'Search hatayein',
  noProducts: 'Abhi koi product nahi hai',
  noProductsHint: 'Neeche ke button se pehla product add karein',
  addProduct: 'Naya product add karein',
  added: (name) => `${name} add ho gaya`,
  name: 'Naam',
  unit: 'Unit',
  openingQty: 'Abhi ka stock',
  minStock: 'Minimum stock',
  minStockHint: 'Isse kam hone par alert',
  category: 'Category',
  costPrice: 'Kharid price ₹',
  sellPrice: 'Bikri price ₹',
  expiryDate: 'Expiry date',
  aliases: 'Doosre naam',
  aliasesHint: 'Comma se alag karein, jaise पारले, parle',
  optional: 'optional',
  save: 'Save karein',
  cancel: 'Cancel',
  errRequired: 'Yeh bharein',
  errWhole: '0 ya zyada poori sankhya likhein',
  errPrice: 'Price 0 se zyada honi chahiye',
  errDate: 'Sahi date chunein',
  errPastDate: 'Expiry date purani nahi ho sakti',
  resetDemo: 'Demo data reset karein',
  resetTitle: 'Demo data reset karna hai?',
  resetBody: 'Saari bikri, naya stock aur orders mit jayenge. Demo ka original stock wapas aa jayega.',
  resetConfirm: 'Haan, reset karein',
  resetDone: 'Demo data reset ho gaya',
};

export const LABELS: Record<Lang, Labels> = { mr, hi, hinglish };
export type { Labels };

/** Keys whose value is a plain string (used for validation error codes). */
export type LabelKey = {
  [K in keyof Labels]: Labels[K] extends string ? K : never;
}[keyof Labels];

export const UNIT_LABELS: Record<Lang, Record<Unit, string>> = {
  mr: { packet: 'packets', kg: 'kg', litre: 'litre', piece: 'नग', box: 'box' },
  hi: { packet: 'packets', kg: 'kg', litre: 'litre', piece: 'पीस', box: 'box' },
  hinglish: { packet: 'packets', kg: 'kg', litre: 'litre', piece: 'piece', box: 'box' },
};
