// Drafts menu_dishes rows from one catering menu — a PDF, or a Word .docx.
//
// Phase P2 of claudedocs/design_beo_order_guide_2026-09-15.md.
//
// Unlike process-beo this has NO geometric parser and deliberately does not want one.
// A BEO is a generated table with a fixed grid, so its coordinates carry the structure.
// The menu PDFs are hand-designed marketing layouts: two-column pages where the price
// column extracts as a detached run of its own (Breakfast prints eight dish names, then
// eight prices, in separate blocks), section headings share a font class with dish
// names, and every text layer reader mangles the ligatures ("Stuﬀed", "T omato").
// Aligning a price to its dish needs to SEE the page, which is what the multimodal
// model does.
//
// A .docx cannot be fed to Gemini at all — its document vision only meaningfully
// understands PDF, and a .docx is a zip, so the raw bytes read as garbage. It is
// converted to HTML first and the model reads markup instead of a page. The two sources
// therefore need DIFFERENT finding rules but the SAME schema and semantics, which is why
// the prompt is a shared core with one swappable section.
//
// That non-determinism is acceptable here and nowhere else: this runs once per menu,
// writes drafts only, and nothing downstream may use a dish until a human confirms it.
// The per-BEO path stays pure arithmetic.

import "jsr:@supabase/functions-js@^2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
// gemini-2.5-flash, NOT the gemini-3-flash-preview the other nine call sites use, and
// measured rather than assumed: 3-flash-preview took 25s on the ONE-page Platters menu,
// which puts the 5-page Plated Dinners well past the 130s gateway margin. This is the
// same conclusion process-beo reached for the same job (multimodal PDF -> JSON) when it
// was reverted to 2.5-flash on 2026-05-30. Nothing here is an upgrade proposal for the
// other call sites; it is the model that finishes inside the timeout for this one.
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const PRICE_UNITS = ['each', 'person', 'dozen', 'tray', 'piece'];
const SEASONS = ['fall', 'winter'];

interface DraftDish {
  name: string;
  menu_section: string | null;
  description: string | null;
  source_page: number | null;
  upcharge: number | null;
  base_price: number | null;
  price_unit: string | null;
  price_qty: number;
  serves: number | null;
  min_order: number | null;
}

// The schema and the semantic rules are identical whatever the file was; only the way a
// dish is FOUND on the page differs, so that part is swapped in per source type below.
const PROMPT_CORE = `
You are reading one catering menu from a private country club. Return every DISH a
kitchen could be asked to produce, as a JSON array. Return ONLY the array.

Each element:
{
  "name": string,             // the dish name ONLY, with no price in it
  "menu_section": string|null,// the heading above it: "Salads", "Premium Entrées",
                              // "Buffet Sides", "Served Cold", "Packaged Snacks"
  "description": string|null, // the sub-line under the name, listing components or choices
  "source_page": number|null, // 1-based page the dish is printed on, null if unknowable
  "upcharge": number|null,    // a "+$N" ADDED to a package price. "Chopped Cobb +$5" -> 5
  "base_price": number|null,  // the dish's OWN standalone price. "Cheeseburger  $7" -> 7
  "price_unit": "each"|"person"|"dozen"|"tray"|"piece"|null,
  "price_qty": number,        // how many price_unit the base_price BUYS. Almost always
                              // 1. "$115 for 20 glasses" -> base_price 115, qty 20.
  "serves": number|null,      // "Serves 20" / "(serves 20)" -> 20
  "min_order": number|null    // "Minimum 20 pieces/type", "(min. order 12)" -> 20 / 12
}

RULES — read carefully, several of these are the whole point of using a model here.

1. UPCHARGE VS BASE PRICE ARE NOT THE SAME NUMBER. A leading "+" means upcharge: the
   dish is part of a package that already carries a per-person price, and this is the
   supplement. A bare price is base_price: the dish is sold on its own. Never put one
   in the other's field. A dish with neither has both null — that is correct and common,
   because it is included in the package price.

3. base_price BUYS price_qty x price_unit. Getting the QUANTITY wrong is the single
   most damaging mistake available to you — a price stated "for 20 pieces" and stored
   as a per-piece price is twenty times too expensive, and it looks perfectly normal.
   - "$8/ea", "Cheeseburger $7"                -> 8,   qty 1,  "each"
   - "$18/person", "$30.00 / person"           -> 18,  qty 1,  "person"
   - "$30/doz", "$24/doz"                      -> 30,  qty 1,  "dozen"
   - "$90/tray"                                -> 90,  qty 1,  "tray"
   - "+$115 for 20 glasses"                    -> 115, qty 20, "each"
   - "Charcuterie Board $200" with "Serves 20" -> 200, qty 1,  null unit, serves 20
   price_qty is 1 unless the menu says the price covers several. price_unit is null
   when there is no base_price or the unit is not one of those five.

   A QUANTITY BASIS STATED ON A SECTION HEADING APPLIES TO EVERY DISH UNDER IT, exactly
   the way a minimum does in rule 4. The hors d'oeuvres are priced per 20 pieces, and
   the menu may say so ONCE on the heading rather than on every line:
     "Hors d'Oeuvres — priced per 20 pieces"
        "Bacon-Wrapped Scallops   $115"   -> 115, qty 20, "piece"
        "Caprese Skewer            $85"   ->  85, qty 20, "piece"
   Carry that basis down onto each dish. Do NOT store 115 with qty 1 — that claims $115
   for one scallop. If a heading gives a basis and a dish states its own different one,
   the DISH wins.

4. A MINIMUM OR YIELD STATED ON A SECTION HEADING APPLIES TO EVERY DISH UNDER IT.
   "Breakfast Sandwiches - Minimum 20 pieces/type" is a heading: give each sandwich
   beneath it min_order 20. Same for "Individually Wrapped Sandwiches - Minimum order
   of 10 per sandwich type" and "Bagel Bar - Minimum 12". Copy the value down onto
   each dish; do not emit the heading itself as a dish.

5. "STARTING AT" IS A FLOOR, NOT A PRICE — and it only matters when the dish has no
   price of its own. Apply this rule ONLY to a dish that states no price anywhere:
   a heading like "Chicken - Starting at $95 for 20 pieces" prices the whole GROUP, and
   the word "starting" says outright the dishes under it do NOT all cost that, so leave
   base_price, price_unit and price_qty EMPTY and put the wording in description
   ("Group price: from $95 for 20 pieces"). Still set min_order from it.
   **If the dish DOES carry its own price, that price wins and this rule is silent** —
   use the dish's figure with the heading's quantity basis, per rule 3.

6. DO NOT EMIT NON-DISHES. Skip package descriptions and policy prose entirely:
   "Starting at $38 for one salad, rolls with butter...", "Add upgrades for total
   cost", "Minimum of 20 people to order", RSVP and seating-chart paragraphs, the
   "Mid-Missouri Harvest Showcase" sourcing blurb, and the "1-Entrée Buffet Package:
   $30.00 / person" package lines. Skip beverages and coffee-station notes.
   DO emit sauces, sides, desserts and salads — they are all things the kitchen makes.

7. DEDUPE ONLY WITHIN A SECTION, NEVER ACROSS SECTIONS. The cold hors d'oeuvres repeat
   verbatim on two pages under the SAME heading — return that dish once. But the SAME
   NAME under a DIFFERENT section is a DIFFERENT row and you must emit BOTH: "Country
   Style Green Beans" is a Custom Buffet side AND a Plated Dinner vegetable side, and
   they are priced separately. Collapsing those loses a real dish.

8. "Specialty Cheesecake" followed by "Strawberry (+$1), Lemon Blueberry (+$1),
   Espresso, Turtle (+$1)..." is ONE dish whose flavours live in description. Do not
   split a flavour list into one dish per flavour, and do not take one of those "+$1"
   values as the dish's upcharge.

9. Fix mangled ligatures and spacing you can see are typographic, not intended:
   "Stuﬀed" -> "Stuffed", "T omato" -> "Tomato", "Buﬀet" -> "Buffet".
   Otherwise preserve the menu's own capitalisation and wording exactly.

10. Do not wrap the output in markdown code fences.
`;

// A rendered PDF page: position carries the meaning, and the model can see it.
const PROMPT_PDF_LAYOUT = `
2. PRICES ARE OFTEN IN A SEPARATE COLUMN FROM THE DISH NAME. Some pages print a list of
   dishes on the left and a column of prices on the right. Align each price with the
   dish it is VERTICALLY level with on the page. If you cannot tell which dish a price
   belongs to, set the price null rather than guessing. A wrong price is worse than
   no price — a missing one shows up as a gap and gets fixed; a wrong one is trusted.
   One Breakfast row prints a literal "$ ? /ea" — that is not a price, return null.
`;

// A .docx converted to HTML by mammoth. There is NO page and NO spatial layout: the
// structure is in the markup. These Word menus are written very differently from the
// PDFs, and TWO different shapes appear in the same file — an inline run of dishes
// separated by "·", and one-dish-per-paragraph with a "•" prefix. The two characters
// mean opposite things, which is the trap this section exists to disarm.
const PROMPT_DOCX_STRUCTURE = `
2. THIS IS A WORD DOCUMENT CONVERTED TO HTML. There are no pages, so ALWAYS return
   source_page as null — never invent a page number. Read the markup, and expect BOTH
   of these shapes in the same document:

   a. INLINE RUN — a section and all of its dishes in ONE paragraph, with dishes
      separated by a MIDDLE DOT "·", like:
        <p><strong>Salads</strong><em>  (pick one)</em>  —  Garden Salad  ·  Caesar
        Salad  ·  Chopped Cobb +$5 </p>
      The <strong> text is the section name. Everything after the em dash "—" splits on
      "·" into SEPARATE DISHES — three here. A <br /> inside the paragraph can start a
      whole new section; treat what follows it as a fresh section heading.

   b. ONE DISH PER PARAGRAPH — the name in <strong>, often prefixed with a literal
      BULLET "•", and its description in <em>:
        <p><strong>•  Roasted Beet & Goat Cheese</strong><em> — candied walnuts,
        arugula</em></p>
      STRIP the leading "•" and any dashes from the name. The <em> text is description.
      A description may instead sit in the NEXT paragraph, entirely in <em>.

   So "·" SEPARATES dishes and "•" PREFIXES one. Never split a name on "•", and never
   treat a "·" run as a single dish.

   c. "(pick one)", "(pick two)", "(pick from)" state how many selections the package
      includes. They are package composition, NOT dishes and NOT part of a name.

   d. A NAMED PACKAGE WITH ITS OWN PER-PERSON PRICE IS ONE DISH, not many:
        <p><strong>Southern BBQ   $41/person</strong></p>
        <p><em>House smoked brisket, shredded pork, elote corn, baked beans</em></p>
      Emit ONE dish "Southern BBQ", base_price 41, price_unit "person", components in
      description. Do NOT emit the components as separate dishes.

   e. QUALIFY THE SECTION WITH THE MENU PART IT SITS UNDER. One document holds several
      parts — "Custom Buffet", "Themed Buffets", "Plated Dinner" — each with its own
      "Salads" and "Dessert". Return menu_section as "Plated Dinner — Dessert", not
      bare "Dessert", or two different desserts collapse into one row.
      Ignore the repeated club-name banner ("THE CLUB AT OLD HAWTHORNE") entirely.

   f. Callout boxes and tables hold real dishes. A single-cell box headed
      "THIS FALL — CHEF'S SEASONAL SELECTIONS" is a normal part of the menu: emit its
      dishes, qualifying menu_section with that box's heading.

   g. A price written but INCOMPLETE — a bare "+$" with no number — gets a null
      upcharge. Never guess the missing figure.
`;

// Splices the source-specific finding rules into the shared core, in place of the
// missing rule 2.
//
// It THROWS when the anchor is absent rather than returning the core unchanged, which
// is the whole point: a silent miss ships a prompt with no layout rules at all and the
// only symptom is a quietly worse parse. That already happened once — rule 3 was
// reworded without updating the anchor, and nothing complained.
const PROMPT_ANCHOR = "3. base_price BUYS";

function assembled(sourceRules: string): string {
  if (!PROMPT_CORE.includes(PROMPT_ANCHOR)) {
    throw new Error(
      `Prompt anchor "${PROMPT_ANCHOR}" not found in PROMPT_CORE — the source-specific ` +
      `rules would be dropped. Fix the anchor before parsing anything.`
    );
  }
  return PROMPT_CORE.replace(PROMPT_ANCHOR, sourceRules + "\n" + PROMPT_ANCHOR);
}

// Coerce one model-emitted dish into the table's shape. The model is the one part of
// this path that can return anything at all, so every field is checked here rather
// than trusted into the database: an out-of-range price_unit or season would be
// rejected by a CHECK constraint and take the whole batch down with it.
function cleanDish(raw: any, page_fallback: number | null): DraftDish | null {
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;

  const num = (v: any): number | null => {
    const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.]/g, '')) : v;
    return typeof n === 'number' && isFinite(n) ? n : null;
  };
  const int = (v: any): number | null => {
    const n = num(v);
    return n === null ? null : Math.round(n);
  };
  const str = (v: any): string | null => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s === '' ? null : s;
  };

  const price_unit = str(raw?.price_unit)?.toLowerCase() ?? null;

  return {
    name,
    menu_section: str(raw?.menu_section),
    description: str(raw?.description),
    source_page: int(raw?.source_page) ?? page_fallback,
    upcharge: num(raw?.upcharge),
    base_price: num(raw?.base_price),
    price_unit: price_unit && PRICE_UNITS.includes(price_unit) ? price_unit : null,
    // A missing or nonsensical quantity must fall back to 1, never 0 or null: the
    // column is NOT NULL, and a 0 here would make any later per-unit division explode.
    price_qty: (num(raw?.price_qty) ?? 1) > 0 ? num(raw?.price_qty) ?? 1 : 1,
    serves: int(raw?.serves),
    min_order: int(raw?.min_order),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { pdfBase64, menuSource } = payload;
    // A Word menu arrives ALREADY converted to HTML by the browser. Converting here
    // instead meant resolving npm:mammoth and its eight dependencies on every cold
    // start, which pushed the request past the 130s gateway margin — and since a menu
    // is loaded perhaps once a season, a cold function is the normal case, not the rare
    // one. This function therefore keeps zero npm dependencies, exactly like the PDF
    // path it has to match for latency.
    const docHtml: string | null =
      typeof payload.docHtml === 'string' && payload.docHtml.trim()
        ? payload.docHtml.trim()
        : null;

    if (!pdfBase64 && !docHtml) {
      throw new Error("pdfBase64 or docHtml is required");
    }
    if (pdfBase64 && docHtml) {
      throw new Error("Send one menu per request, not both");
    }
    if (!menuSource || !String(menuSource).trim()) {
      throw new Error("menuSource is required — it is half of a dish's identity");
    }

    // Season comes from the CALLER, not the model: it is a property of which file was
    // uploaded ("Seasonal - Fall.pdf"), and asking the model to infer it from the page
    // would make identity itself non-deterministic.
    const season = SEASONS.includes(payload.season) ? payload.season : null;

    // A model this prompt disagrees with is easier to diagnose against the raw array
    // than against a row count, so parse-only is a first-class mode, as in process-beo.
    const parseOnly = payload.parseOnly === true;

    const prompt = docHtml
      ? assembled(PROMPT_DOCX_STRUCTURE)
      : assembled(PROMPT_PDF_LAYOUT);

    const parts = docHtml
      ? [{ text: prompt }, { text: `\n\nTHE MENU (HTML):\n${docHtml}` }]
      : [{ text: prompt }, { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 130000);

    let geminiRes;
    try {
      geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            response_mime_type: "application/json",
            // Same reasoning as process-beo: unset this defaults to 1.0 and the model
            // re-decides an ambiguous layout on every run. Greedy decoding is not a
            // determinism guarantee, but it removes the worst of the churn — and here
            // a human confirms every row anyway.
            temperature: 0,
          },
        }),
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        throw new Error("Gemini timed out after 130 seconds reading this menu.");
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiRes.ok) {
      throw new Error(`Gemini API Error: ${await geminiRes.text()}`);
    }

    const geminiData = await geminiRes.json();
    const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawOutput) throw new Error("Gemini returned empty output");

    let parsed = JSON.parse(rawOutput);
    if (!Array.isArray(parsed)) parsed = [parsed];

    // A .docx has no pages, so there is no sensible fallback — null beats inventing a 1
    // that a reviewer would then use to go looking for the dish on "page 1".
    const dishes = parsed
      .map((d: any) => cleanDish(d, docHtml ? null : 1))
      .filter((d: DraftDish | null): d is DraftDish => d !== null);

    // A menu that yields nothing is a failed read, not an empty menu — every one of
    // these 8 files has dishes on it. Say so rather than reporting "0 drafted", which
    // reads like success.
    if (dishes.length === 0) {
      throw new Error("No dishes could be read from this menu. Nothing was saved.");
    }

    const rows = dishes.map(d => ({ ...d, menu_source: String(menuSource).trim(), season }));

    if (parseOnly) {
      return new Response(
        JSON.stringify({ dishes: rows, count: rows.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // One RPC, so a menu can never land half-written and a dish someone already
    // confirmed can never be overwritten by a re-draft.
    const { data: result, error } = await db.rpc('upsert_menu_dish_drafts', { p_dishes: rows });
    if (error) throw error;

    const counts = Array.isArray(result) ? result[0] : result;

    return new Response(
      JSON.stringify({
        success: true,
        menu_source: String(menuSource).trim(),
        season,
        read: rows.length,
        ...counts,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error processing menu:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
