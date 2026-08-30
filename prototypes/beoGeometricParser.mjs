// Geometric BEO table parser — prototype.
//
// Reads the table from the PDF's own text coordinates instead of asking a model to
// infer it, so the same PDF always yields the same JSON.
//
// Layout, verified across all 27 pages of a real packet:
//   left  x <= 60    row label ("Custom Buffets", "Services") or a time range
//   mid   x 60-500   centre column, always centred at c = 322
//   qty   x ~= 538   anchored per page off the "Qty" cell of each section header
//
// Line spacing carries meaning and is the key signal:
//   gap ~11-12  a wrapped line INSIDE the cell above  -> continuation
//   gap ~16-17  a new table row                       -> item or category header
//   gap ~25-26  a section header
import fs from 'fs';
const pdfjsLib = await import(new URL('../app/node_modules/pdfjs-dist/legacy/build/pdf.mjs', import.meta.url).href);

const LEFT_MAX = 60;
const QTY_TOL = 8;
const NEW_ROW_GAP = 14;          // below this, the line is wrapped text, not a new row
const TIME_RANGE = /^\d{1,2}:\d{2}\s*[ap]m\s*-\s*\d{1,2}:\d{2}\s*[ap]m$/i;
const DATE_RANGE = /(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/;

const iso = (mdy) => { const [m, d, y] = mdy.split('/'); return `${y}-${m}-${d}`; };
const leftCell = (row) => row.cells.find(c => c.x <= LEFT_MAX);
const isSectionHeader = (row) => row.cells.some(c => c.text === 'Qty' && c.x > 400);
const isFooter = (row) => row.cells[0]?.text === 'Page';
const qtyCell = (row, qtyX) => qtyX ? row.cells.find(c => Math.abs(c.x - qtyX) <= QTY_TOL) : null;
const midCells = (row, qtyX) =>
  row.cells.filter(c => c.x > LEFT_MAX && !(qtyX && Math.abs(c.x - qtyX) <= QTY_TOL));
const midText = (row, qtyX) => midCells(row, qtyX).map(c => c.text).join(' ').trim();

async function pageRows(doc, n) {
  const content = await (await doc.getPage(n)).getTextContent();
  const byY = new Map();
  for (const it of content.items) {
    if (!it.str.trim()) continue;
    const y = Math.round(it.transform[5]);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y).push({ x: Math.round(it.transform[4]), text: it.str.trim() });
  }
  const ys = [...byY.keys()].sort((a, b) => b - a);
  return ys.map((y, i) => ({
    y,
    gap: i === 0 ? 99 : ys[i - 1] - y,
    cells: byY.get(y).sort((a, b) => a.x - b.x),
  }));
}

// A lone centre line names a CATEGORY only when it sits on its own table row (gap)
// AND the next row bearing a left-hand cell carries a real label. A header printed
// over two lines ("Golf Shop Services - TBD" / "Golf Shop") is reached by scanning
// past the wrapped lines. Reaching an item row, a section header, the notes block
// or the footer first means this line was wrapped text belonging to the item above.
function isCategoryHeader(rows, i, qtyX) {
  if (rows[i].gap < NEW_ROW_GAP) return false;
  for (let j = i + 1; j < rows.length; j++) {
    const r = rows[j];
    if (isFooter(r) || isSectionHeader(r)) return false;
    if (r.cells.length === 1 && r.cells[0].text === 'Notes') return false;
    const l = leftCell(r);
    if (l) return !TIME_RANGE.test(l.text);
    if (qtyCell(r, qtyX)) return false;
  }
  return false;
}

export async function parsePacket(file) {
  const doc = await pdfjsLib.getDocument(new Uint8Array(fs.readFileSync(file))).promise;
  const events = new Map();

  for (let n = 1; n <= doc.numPages; n++) {
    const rows = await pageRows(doc, n);

    // The footer names the event and its BEO number — the key for merging an event
    // that spans several pages.
    const key = rows.find(isFooter)?.cells.find(c => c.text.includes('/#'))?.text;
    if (!key) continue;

    if (!events.has(key)) events.set(key, {
      event_name: key.split('/#')[0],
      // The footer's BEO number is a stronger identity than name+date: one packet can
      // carry two BEOs with the same event name (State Farm #4163-1 and #4164-1).
      beo_number: key.split('/#')[1] || null,
      event_date: null, event_end_date: null,
      start_time: null, guest_count: 0, location: null,
      timeline: [], sections: [], notes_text: null,
    });
    const ev = events.get(key);

    for (const row of rows) {
      const l = leftCell(row);
      if (!l) continue;
      if (l.text === 'Event Headcount') ev.guest_count = parseInt(row.cells.at(-1).text, 10) || ev.guest_count;
      if (l.text === 'Event Date(s)') {
        const m = row.cells.map(c => c.text).join(' ').match(DATE_RANGE);
        if (m) { ev.event_date = iso(m[1]); ev.event_end_date = m[2] === m[1] ? null : iso(m[2]); }
      }
      if (l.text === 'Event Location(s)' && !ev.location) ev.location = midText(row);
    }

    // Timeline table: the rows between its "Start Date" header and the first section
    // header. Columns sit at x 53 / 142 / 202 / 337; a wrapped line (small gap) is
    // appended to the previous entry's item text rather than starting a new one.
    const tlStart = rows.findIndex(r => r.cells[0]?.text === 'Start Date');
    if (tlStart >= 0) {
      for (let j = tlStart + 1; j < rows.length; j++) {
        const r = rows[j];
        if (isSectionHeader(r) || isFooter(r)) break;
        const date = r.cells.find(c => c.x >= 45 && c.x <= 60 && /^\d{2}\/\d{2}\/\d{4}$/.test(c.text));
        if (!date) {
          const last = ev.timeline.at(-1);
          if (last && r.gap < NEW_ROW_GAP) last.item += ' ' + r.cells.map(c => c.text).join(' ');
          continue;
        }
        const time = r.cells.find(c => c.x > 130 && c.x < 200);
        const rest = r.cells.filter(c => c.x >= 200);
        ev.timeline.push({
          date: iso(date.text),
          time: time?.text || '',
          item: rest[0]?.text || '',
          description: rest.slice(1).map(c => c.text).join(' '),
        });
      }
    }

    let section = null, category = null, item = null, lastLabel = '', qtyX = null, notes = false;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (isFooter(row)) break;

      if (isSectionHeader(row)) {
        qtyX = row.cells.find(c => c.text === 'Qty').x + 2;
        const day = leftCell(row)?.text || '';
        // The repeated club-contact line can share a baseline with this row, so take
        // only the first centre cell.
        const head = midCells(row, qtyX)[0]?.text || '';
        const [meal, time, ...loc] = head.split(' - ');
        const dm = day.match(/(\d{2}\/\d{2}\/\d{4})/);
        section = {
          date: dm ? iso(dm[1]) : ev.event_date, day_label: day,
          meal_type: (meal || '').trim(), time: (time || '').trim(),
          location: loc.join(' - ').trim() || null, categories: [],
        };
        ev.sections.push(section);
        category = null; item = null; lastLabel = ''; notes = false;
        continue;
      }

      if (row.cells.length === 1 && row.cells[0].text === 'Notes') { notes = true; item = null; continue; }
      if (notes) {
        const t = row.cells.map(c => c.text).join(' ');
        ev.notes_text = ev.notes_text ? ev.notes_text + '\n' + t : t;
        continue;
      }
      if (!section) continue;

      const l = leftCell(row);
      const q = qtyCell(row, qtyX);
      const mid = midText(row, qtyX);
      if (!mid && !q) continue;

      if (q) {
        // A qty starts a new item. The left cell is its label unless it is a time
        // range, in which case the label carries forward from the row above.
        if (l && !TIME_RANGE.test(l.text)) lastLabel = l.text;
        if (!category) {
          category = { name: lastLabel || section.meal_type || 'Items', items: [] };
          section.categories.push(category);
        }
        item = { label: lastLabel || category.name, description: mid, qty: q.text };
        category.items.push(item);
        continue;
      }

      if (isCategoryHeader(rows, i, qtyX)) {
        category = { name: mid, items: [] };
        section.categories.push(category);
        item = null;
        // Swallow the wrapped remainder of a multi-line header.
        while (i + 1 < rows.length && rows[i + 1].gap < NEW_ROW_GAP
               && !leftCell(rows[i + 1]) && !qtyCell(rows[i + 1], qtyX)) i++;
        continue;
      }

      if (item) item.description = item.description ? item.description + '\n' + mid : mid;
    }

    // Drop any category the page opened but never filled.
    ev.sections.forEach(s => { s.categories = s.categories.filter(c => c.items.length); });
  }

  for (const ev of events.values()) {
    // Every page of a multi-page event reprints the timeline table, so keep one of each.
    const seen = new Set();
    ev.timeline = ev.timeline.filter(t => {
      const k = `${t.date}|${t.time}|${t.item}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    ev.start_time = ev.sections.map(s => s.time).filter(Boolean)[0] || null;
  }
  return [...events.values()];
}
