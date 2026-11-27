/**
 * Product matching by name + local aliases (Devanagari and Latin), with fuzzy tolerance
 * for accents / ASR spelling variants. Returns candidates best-first with a score 0..1.
 * The caller (NLU) decides: one strong match → confirm; several close → ask the user to choose.
 */
import type { Product } from '../contracts/types';

export const MATCH_THRESHOLD = 0.72;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[़ँॅॉ]/g, (c) => ({ '़': '', 'ँ': 'ं', 'ॅ': 'े', 'ॉ': 'ो' })[c] ?? c) // nukta, chandrabindu, candra e/o → plain
    .replace(/[^a-z0-9ऀ-ॿ]/g, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

function similarity(q: string, term: string): number {
  if (!q || !term) return 0;
  if (q === term) return 1;
  // query is a sentence/phrase that contains the alias ("10 parle g packets")
  if (term.length >= 3 && q.includes(term)) return 0.9;
  // brand prefix ("टाटा" → "टाटाचहा", "parle" → "parleg") — strong but ambiguous on purpose
  if (q.length >= 3 && term.startsWith(q)) return 0.85;
  // alias contains the query somewhere else
  if (q.length >= 3 && term.includes(q)) return 0.8 * (q.length / term.length) + 0.15;
  return 1 - levenshtein(q, term) / Math.max(q.length, term.length);
}

export function matchProducts(products: Product[], query: string): { product: Product; score: number }[] {
  const q = normalize(query);
  if (!q) return [];
  const scored = products.map((product) => {
    const terms = [product.name, ...product.aliases].map(normalize);
    return { product, score: Math.max(...terms.map((t) => similarity(q, t))) };
  });
  return scored.filter((x) => x.score >= MATCH_THRESHOLD).sort((a, b) => b.score - a.score);
}

/** True if any name/alias of `p` collides with an existing product. */
export function findDuplicate(products: Product[], p: Pick<Product, 'name' | 'aliases'>): Product | undefined {
  const names = new Set([p.name, ...p.aliases].map(normalize).filter(Boolean));
  return products.find((x) => [x.name, ...x.aliases].some((a) => names.has(normalize(a))));
}
