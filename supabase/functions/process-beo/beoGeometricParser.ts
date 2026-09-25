// Geometric BEO table parser.
//
// Reads the table from the PDF's own text coordinates rather than asking a model to
// infer it, so the same PDF always yields the same JSON. Gemini re-groups the same
// packet differently between days; this cannot.
//
// Layout, verified across 5 real packets / 70 events / 224 items (4 daily packets plus
// one 92-page event-contract bundle):
//   left  x <= 60    row label ("Custom Buffets", "Services") or a time range
//   mid   x 60-500   centre column, always centred at c = 322
//   qty   x ~= 538   anchored per page off the "Qty" cell of each section header
//
// Line spacing carries meaning and is the signal the rest depends on:
//   gap ~11-12  a wrapped line INSIDE the cell above  -> continuation
//   gap ~16-17  a new table row                       -> item or category header
//   gap ~25-26  a section header
import { getDocumentProxy } from "npm:unpdf";

const LEFT_MAX = 60;
const QTY_TOL = 8;
const NEW_ROW_GAP = 14;
const TIME_RANGE = /^\d{1,2}:\d{2}\s*[ap]m\s*-\s*\d{1,2}:\d{2}\s*[ap]m$/i;
const DATE_RANGE = /(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/;

export interface Cell { x: number; text: string; }
export interface Row { y: number; gap: number; cells: Cell[]; }
export interface BeoItem { label: string; description: string; qty: string; }
export interface BeoCategory { name: string; items: BeoItem[]; }
export interface BeoSection {
  date: string | null;
  day_label: string;
  meal_type: string;
  time: string;
  location: string | null;
  categories: BeoCategory[];
}
export interface TimelineRow { date: string; time: string; item: string; description: string; }
export interface BeoEventOut {
  event_name: string;
  beo_number: string | null;
  event_date: string | null;
  event_end_date: string | null;
  start_time: string | null;
  guest_count: number;
  location: string | null;
  timeline: TimelineRow[];
  sections: BeoSection[];
  notes_text: string | null;
}

const iso = (mdy: string) => { const [m, d, y] = mdy.split("/"); return `${y}-${m}-${d}`; };
const leftCell = (row: Row) => row.cells.find((c) => c.x <= LEFT_MAX);
const isSectionHeader = (row: Row) => row.cells.some((c) => c.text === "Qty" && c.x > 400);
const isFooter = (row: Row) => row.cells[0]?.text === "Page";
const qtyCell = (row: Row, qtyX: number | null) =>
  qtyX ? row.cells.find((c) => Math.abs(c.x - qtyX) <= QTY_TOL) : undefined;
// qtyX is null until a section header has been seen — the Event Location(s) row is read
// that way, and then no cell is excluded as a quantity.
const midCells = (row: Row, qtyX: number | null = null) =>
  row.cells.filter((c) => c.x > LEFT_MAX && !(qtyX && Math.abs(c.x - qtyX) <= QTY_TOL));
const midText = (row: Row, qtyX: number | null = null) =>
  midCells(row, qtyX).map((c) => c.text).join(" ").trim();

// Text runs grouped into visual rows by baseline, each row carrying the gap to the row
// above so a wrapped line can be told from a new row.
async function loadRows(bytes: Uint8Array): Promise<Row[][]> {
  const doc = await getDocumentProxy(new Uint8Array(bytes));
  const pages: Row[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    const byY = new Map<number, Cell[]>();
    for (const it of content.items) {
      // getTextContent returns TextItem | TextMarkedContent; only the former carries
      // text and a transform. Skipping the rest keeps a marked-content item from
      // throwing on `.str`.
      if (!("str" in it) || !("transform" in it)) continue;
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y)!.push({ x: Math.round(it.transform[4]), text: it.str.trim() });
    }
    const ys = [...byY.keys()].sort((a, b) => b - a);
    pages.push(ys.map((y, i) => ({
      y,
      gap: i === 0 ? 99 : ys[i - 1] - y,
      cells: byY.get(y)!.sort((a, b) => a.x - b.x),
    })));
  }
  return pages;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

// The club's own page header is reprinted on every page. On a continuation page of a
// multi-page BEO the table resumes at the top and these lines interleave with it, so the
// reconciliation scan sees them as table content. They are furniture, ignored by the
// assembler, and must not count as dropped rows.
const PAGE_FURNITURE = /^(Club Contact:|E:\s*\S+@|Printed:|The Club at Old Hawthorne$)/;

// A page of an event either opens with the event's own header block (contacts,
// headcount, timeline) and starts its table afresh, or CONTINUES the table from the page
// before without reprinting a section header. Eurofins 09/24 prints its cocktail hour on
// page 1 and the whole plated dinner — courses, entrées, desserts — on page 2 under the
// page-1 "Dinner" header. Treating every page as fresh threw those pages away, and the
// reconciliation, which also waited for a Qty header, never looked at them either.
const FRESH_PAGE = new Set(["Event Headcount", "Start Date", "Primary Contact"]);
const isFreshPage = (rows: Row[]) => rows.some((r) => r.cells.some((c) => FRESH_PAGE.has(c.text)));
// A continuation page reprints the title, location and club contact at the top; its table
// resumes on the row after the "Club Contact:" line.
const bodyStart = (rows: Row[]) =>
  rows.findIndex((r) => r.cells.some((c) => c.text.startsWith("Club Contact:"))) + 1;

// Reconciliation: every centre-column line printed inside a section must survive into
// the output — as a category name, an item label, or a line of a description. Lines
// that vanish are the failure this exists to catch.
//
// It deliberately does NOT model how rows group into items. Grouping is the
// assembler's job, and a check that repeats the assembler's rules only restates them.
// The previous version counted qty-bearing rows, which IS the assembler's definition
// of a row, so the two agreed by construction: on the 08-31 packet it reported a clean
// 17 = 17 while three events lost their entire menu, because a section that prints no
// qty produced no items and no counted rows alike. Sharing no code was not enough;
// what matters is sharing no premise. Column geometry (midText) is shared knowingly —
// that is a fact about the page, not an assumption about rows.
//
// Only pages carrying a BEO footer are checked, matching the pages the assembler
// consumes. A BEO can arrive inside a larger contract bundle (one 92-page EVENT
// CONTRACT holds its BEO pages at 39-53, 65-69, 84-87); checking the contract pages
// too would report phantom losses and push a good parse to the model.
function droppedLines(pages: Row[][], events: BeoEventOut[]): string[] {
  // Kept text is indexed PER EVENT, not pooled. Two BEOs in one packet routinely print
  // the same menu — Linkside and Vistas 09/03 and 09/08 are the same three plated
  // dishes — so a pooled index lets the surviving copy vouch for the lost one and hides
  // exactly the failure this guards against.
  //
  // Each printed line must be CONSUMED by exactly one kept line of a description, counted
  // with repeats. Mere presence was not enough: "per dozen", "serves 20" and "N pieces"
  // repeat across items, so one surviving copy vouched for a lost one — deleting single
  // lines from real output went unnoticed 278 times in 1508 (33 whole items in 596,
  // among them a Beverages x300). Those are the lines the order list reads quantities
  // from. Only category names fall back to containment: the assembler joins a header
  // wrapped over two lines into one name, so each printed line is just part of it.
  // Joined on a newline so a match cannot straddle two unrelated names.
  const linesFor = new Map<string, Map<string, number>>();
  const headsFor = new Map<string, string>();
  for (const ev of events) {
    const lines = new Map<string, number>();
    const heads: string[] = [];
    for (const s of ev.sections) {
      for (const c of s.categories) {
        heads.push(norm(c.name));
        for (const it of c.items) {
          for (const l of it.description.split("\n")) lines.set(norm(l), (lines.get(norm(l)) ?? 0) + 1);
        }
      }
    }
    const key = `${ev.event_name}/#${ev.beo_number}`;
    linesFor.set(key, lines);
    headsFor.set(key, heads.join("\n"));
  }

  const missing: string[] = [];
  // Where the previous page of each event left off, so a continuation page is checked
  // from its first table row rather than skipped until a Qty header that never comes.
  const carry = new Map<string, { qtyX: number | null; notes: boolean }>();
  for (const page of pages) {
    const key = page.find(isFooter)?.cells.find((c) => c.text.includes("/#"))?.text;
    if (!key) continue;
    const lines = linesFor.get(key) ?? new Map<string, number>();
    const heads = headsFor.get(key) ?? "";
    const fresh = isFreshPage(page) || !carry.has(key);
    // bodyStart reads 0 when the "Club Contact:" line is missing, and the page title and
    // location would then be read as menu text — kept, so no line looks lost. Both
    // halves share that rule, so the gate cannot catch it; refuse the page instead.
    if (!fresh && bodyStart(page) === 0) {
      missing.push(`continuation page of ${key} has no "Club Contact:" header line`);
    }
    let { qtyX, notes } = fresh ? { qtyX: null as number | null, notes: false } : carry.get(key)!;
    for (const r of page.slice(fresh ? 0 : bodyStart(page))) {
      if (isFooter(r)) break;
      const h = r.cells.find((c) => c.text === "Qty" && c.x > 400);
      if (h) { qtyX = h.x + 2; notes = false; continue; }
      if (!qtyX) continue;   // still above the first section header, not in the table
      if (r.cells.length === 1 && r.cells[0].text === "Notes") { notes = true; continue; }
      if (notes) continue;   // the notes block is free text, not table content
      const t = midText(r, qtyX);
      if (!t || PAGE_FURNITURE.test(t)) continue;
      const left = lines.get(norm(t)) ?? 0;
      if (left > 0) lines.set(norm(t), left - 1);
      else if (!heads.includes(norm(t))) missing.push(t);
    }
    carry.set(key, { qtyX, notes });
  }
  return missing;
}

// A lone centre line names a CATEGORY only when it sits on its own table row (gap) AND
// the very next table row carries a real left-hand label — every category in these BEOs
// opens with its row-type word printed ("Bar Services" then "Services", "Bakery" then
// "Displayed"). The scan skips only wrapped lines belonging to this same header, then
// stops: it must NOT walk on past an intervening row to find a label further down. Doing
// so misread free text as a header and threw away everything under it — a whole custom
// dinner menu ("Pacific salmon rollup…") became an empty category and vanished.
function isCategoryHeader(rows: Row[], i: number, qtyX: number | null): boolean {
  if (rows[i].gap < NEW_ROW_GAP) return false;
  for (let j = i + 1; j < rows.length; j++) {
    const r = rows[j];
    if (isFooter(r) || isSectionHeader(r)) return false;
    if (r.cells.length === 1 && r.cells[0].text === "Notes") return false;
    if (r.gap < NEW_ROW_GAP) continue;   // wrapped remainder of this same header line
    // A category's first row normally carries BOTH its label and a qty, so the label
    // decides; a new row without one means this line was not a header.
    const l = leftCell(r);
    return !!l && !TIME_RANGE.test(l.text);
  }
  return false;
}

interface TableState {
  section: BeoSection | null;
  category: BeoCategory | null;
  item: BeoItem | null;
  lastLabel: string;
  qtyX: number | null;
  notes: boolean;
}
const freshState = (): TableState =>
  ({ section: null, category: null, item: null, lastLabel: "", qtyX: null, notes: false });

function assemble(pages: Row[][]): BeoEventOut[] {
  const events = new Map<string, BeoEventOut>();
  // Where each event's table stood at the foot of its last page (see isFreshPage).
  const tables = new Map<string, TableState>();

  for (const rows of pages) {
    // The footer names the event and its BEO number — the key for merging an event
    // that spans several pages, and for telling apart two BEOs sharing a name.
    const key = rows.find(isFooter)?.cells.find((c) => c.text.includes("/#"))?.text;
    if (!key) continue;

    if (!events.has(key)) {
      events.set(key, {
        event_name: key.split("/#")[0],
        beo_number: key.split("/#")[1] || null,
        event_date: null,
        event_end_date: null,
        start_time: null,
        guest_count: 0,
        location: null,
        timeline: [],
        sections: [],
        notes_text: null,
      });
    }
    const ev = events.get(key)!;

    for (const row of rows) {
      const l = leftCell(row);
      if (!l) continue;
      if (l.text === "Event Headcount") {
        ev.guest_count = parseInt(row.cells.at(-1)!.text, 10) || ev.guest_count;
      }
      if (l.text === "Event Date(s)") {
        const m = row.cells.map((c) => c.text).join(" ").match(DATE_RANGE);
        if (m) {
          ev.event_date = iso(m[1]);
          ev.event_end_date = m[2] === m[1] ? null : iso(m[2]);
        }
      }
      if (l.text === "Event Location(s)" && !ev.location) ev.location = midText(row);
    }

    // Timeline table: rows between its "Start Date" header and the first section header.
    const tlStart = rows.findIndex((r) => r.cells[0]?.text === "Start Date");
    if (tlStart >= 0) {
      for (let j = tlStart + 1; j < rows.length; j++) {
        const r = rows[j];
        if (isSectionHeader(r) || isFooter(r)) break;
        const date = r.cells.find((c) => c.x >= 45 && c.x <= 60 && /^\d{2}\/\d{2}\/\d{4}$/.test(c.text));
        if (!date) {
          const last = ev.timeline.at(-1);
          if (last && r.gap < NEW_ROW_GAP) last.item += " " + r.cells.map((c) => c.text).join(" ");
          continue;
        }
        const time = r.cells.find((c) => c.x > 130 && c.x < 200);
        const rest = r.cells.filter((c) => c.x >= 200);
        ev.timeline.push({
          date: iso(date.text),
          time: time?.text || "",
          item: rest[0]?.text || "",
          description: rest.slice(1).map((c) => c.text).join(" "),
        });
      }
    }

    const fresh = isFreshPage(rows) || !tables.has(key);
    let { section, category, item, lastLabel, qtyX, notes } = fresh ? freshState() : tables.get(key)!;

    // A continuation page is read from below its page header, minus the contact e-mail
    // line that interleaves with the resumed table. Its first table row is measured as a
    // new row, as the top of any page is: its gap to the e-mail line above is small, and
    // read as a wrapped line it glued the page's opening category header ("Beverage
    // Services", "Course One - Pre-set During Cocktail Hour") onto the item before.
    let body = rows;
    if (!fresh) {
      body = rows.slice(bodyStart(rows)).filter((r) => !PAGE_FURNITURE.test(midText(r)));
      if (body.length) body[0] = { ...body[0], gap: 99 };
    }

    for (let i = 0; i < body.length; i++) {
      const row = body[i];
      if (isFooter(row)) break;

      if (isSectionHeader(row)) {
        qtyX = row.cells.find((c) => c.text === "Qty")!.x + 2;
        const day = leftCell(row)?.text || "";
        // The repeated club-contact line can share a baseline with this row, so take
        // only the first centre cell.
        const head = midCells(row, qtyX)[0]?.text || "";
        const [meal, time, ...loc] = head.split(" - ");
        const dm = day.match(/(\d{2}\/\d{2}\/\d{4})/);
        section = {
          date: dm ? iso(dm[1]) : ev.event_date,
          day_label: day,
          meal_type: (meal || "").trim(),
          time: (time || "").trim(),
          location: loc.join(" - ").trim() || null,
          categories: [],
        };
        ev.sections.push(section);
        category = null; item = null; lastLabel = ""; notes = false;
        continue;
      }

      if (row.cells.length === 1 && row.cells[0].text === "Notes") { notes = true; item = null; continue; }
      if (notes) {
        const t = row.cells.map((c) => c.text).join(" ");
        ev.notes_text = ev.notes_text ? ev.notes_text + "\n" + t : t;
        continue;
      }
      if (!section) continue;

      const l = leftCell(row);
      const q = qtyCell(row, qtyX);
      const mid = midText(row, qtyX);
      if (!mid && !q) continue;

      const label = l && !TIME_RANGE.test(l.text) ? l.text : null;

      // The label cell wraps too, and a wrapped line carries the same small gap as any
      // other continuation: "Hot Grab-n-Go" / "Breakfast" is one label printed over two
      // lines, and the centre text beside the second line ("foil wrapped") belongs to
      // the dish above. Treating it as a new row both truncates the label and tears the
      // description in half.
      if (label && !q && row.gap < NEW_ROW_GAP && item) {
        lastLabel = `${lastLabel} ${label}`.trim();
        item.label = lastLabel;
        if (mid) item.description = item.description ? item.description + "\n" + mid : mid;
        continue;
      }

      // A row starts a new item when it carries a qty OR opens a new table row with a
      // left-column label. The BEO prints the Qty once per section — on that section's
      // first row — and omits it altogether when the headcount is 0, so keying an item
      // on the qty alone loses whole menus: Linkside Dinner Club 09/03 prints three
      // plated dishes and no qty anywhere on the page. A time range in the left cell is
      // not a label; it continues the item above.
      if (q || (label && row.gap >= NEW_ROW_GAP)) {
        if (label) lastLabel = label;
        if (!category) {
          category = { name: lastLabel || section.meal_type || "Items", items: [] };
          section.categories.push(category);
        }
        item = { label: lastLabel || category.name, description: mid, qty: q?.text ?? "" };
        category.items.push(item);
        continue;
      }

      if (isCategoryHeader(body, i, qtyX)) {
        // Keep the wrapped remainder of a multi-line header rather than discarding it:
        // "Quick Lunch Bites" / "Minimum order of 10 per item" is one header, and the
        // second line is a real instruction to the kitchen.
        let name = mid;
        while (
          i + 1 < body.length && body[i + 1].gap < NEW_ROW_GAP &&
          !leftCell(body[i + 1]) && !qtyCell(body[i + 1], qtyX)
        ) {
          i++;
          const more = midText(body[i], qtyX);
          if (more) name += " " + more;
        }
        category = { name, items: [] };
        section.categories.push(category);
        item = null;
        continue;
      }

      if (item) { item.description = item.description ? item.description + "\n" + mid : mid; continue; }

      // A centre line with no item open to join starts one rather than vanishing. A
      // SUMMARY take-out page ("Homecoming Take Out" 10/03) prints a whole priced menu with
      // no left label and no qty on any row, so nothing above ever opened an item. The
      // lines stay in print order in one description — the page prints 9 prices for 8
      // dishes, so splitting it per dish would have to guess which price is whose.
      if (!category) {
        category = { name: lastLabel || section.meal_type || "Items", items: [] };
        section.categories.push(category);
      }
      item = { label: lastLabel || category.name, description: mid, qty: "" };
      category.items.push(item);
    }

    tables.set(key, { section, category, item, lastLabel, qtyX, notes });
  }

  for (const ev of events.values()) {
    // Only once every page is read: a category opened at the foot of one page gets its
    // items on the next.
    ev.sections.forEach((s) => { s.categories = s.categories.filter((c) => c.items.length); });
    // Every page of a multi-page event reprints the timeline table, so keep one of each.
    const seen = new Set<string>();
    ev.timeline = ev.timeline.filter((t) => {
      const k = `${t.date}|${t.time}|${t.item}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    ev.start_time = ev.sections.map((s) => s.time).filter(Boolean)[0] || null;
  }
  return [...events.values()];
}

// Parse and reconcile. `ok` is false whenever the result cannot be trusted, so the
// caller falls back to the model rather than writing a wrong order list.
export async function parseGeometric(bytes: Uint8Array) {
  const pages = await loadRows(bytes);
  const events = assemble(pages);
  const items = events.reduce(
    (a, e) => a + e.sections.reduce((b, s) => b + s.categories.reduce((c, k) => c + k.items.length, 0), 0),
    0,
  );
  const dropped = droppedLines(pages, events);

  let reason = null;
  if (!events.length) reason = "no events found (no BEO page footer)";
  else if (dropped.length) {
    reason = `${dropped.length} table line(s) dropped, first: "${dropped[0].slice(0, 60)}"`;
  } else if (events.some((e) => !e.event_name || !e.event_date)) {
    reason = "an event is missing name or date";
  }

  // `dropped` carries the offending lines, not just a count — when the gate fires the
  // log should say what went missing, otherwise the fallback is undiagnosable.
  return { ok: !reason, reason, events, items, dropped, pages: pages.length };
}
