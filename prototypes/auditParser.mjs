import fs from 'fs';
import crypto from 'crypto';
import { parsePacket } from './beoGeometricParser.mjs';
const pdfjsLib = await import(new URL('../app/node_modules/pdfjs-dist/legacy/build/pdf.mjs', import.meta.url).href);

const file = process.argv[2];
const doc = await pdfjsLib.getDocument(new Uint8Array(fs.readFileSync(file))).promise;

// Independent ground truth: count qty-bearing rows below each section header,
// straight off the raw text positions, without using the parser at all.
const truth = new Map();
for (let n = 1; n <= doc.numPages; n++) {
  const content = await (await doc.getPage(n)).getTextContent();
  const byY = new Map();
  for (const it of content.items) {
    if (!it.str.trim()) continue;
    const y = Math.round(it.transform[5]);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y).push({ x: Math.round(it.transform[4]), t: it.str.trim() });
  }
  const rows = [...byY.entries()].sort((a, b) => b[0] - a[0]).map(([, c]) => c.sort((a, b) => a.x - b.x));
  const key = rows.find(r => r[0]?.t === 'Page')?.find(c => c.t.includes('/#'))?.t;
  if (!key) continue;
  let qtyX = null, count = 0, sum = 0;
  for (const r of rows) {
    if (r[0]?.t === 'Page') break;
    const h = r.find(c => c.t === 'Qty' && c.x > 400);
    if (h) { qtyX = h.x + 2; continue; }
    if (!qtyX) continue;
    const q = r.find(c => Math.abs(c.x - qtyX) <= 8 && /^\d+$/.test(c.t));
    if (q) { count++; sum += parseInt(q.t, 10); }
  }
  const cur = truth.get(key) || { count: 0, sum: 0 };
  truth.set(key, { count: cur.count + count, sum: cur.sum + sum });
}

const evs = await parsePacket(file);
let ok = 0, bad = [];
for (const e of evs) {
  const items = e.sections.flatMap(s => s.categories.flatMap(c => c.items));
  // Key on the BEO number, not the name — one packet can hold two BEOs named alike.
  const t = truth.get(`${e.event_name}/#${e.beo_number}`) || { count: 0, sum: 0 };
  const sum = items.reduce((a, it) => a + (parseInt(it.qty, 10) || 0), 0);
  if (items.length === t.count && sum === t.sum) ok++;
  else bad.push(`${e.event_name}: parsed ${items.length} items/${sum} qty vs PDF ${t.count}/${t.sum}`);
}
console.log(`${ok} of ${evs.length} events match the raw qty-row count and qty sum exactly`);
bad.forEach(b => console.log('  MISMATCH ' + b));

// Determinism: parse twice, hash the full output.
const h = async () => crypto.createHash('sha256').update(JSON.stringify(await parsePacket(file))).digest('hex').slice(0, 16);
const [h1, h2] = [await h(), await h()];
console.log(`\ndeterminism: ${h1} / ${h2} -> ${h1 === h2 ? 'IDENTICAL' : 'DIFFERENT'}`);
