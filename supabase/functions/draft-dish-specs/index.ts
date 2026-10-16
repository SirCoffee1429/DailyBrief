// Drafts the two confirm-once tables of the BEO order guide:
//
//   mode "ingredients" — dish_ingredients for a batch of orderable dishes
//   mode "products"    — ingredient_products for a batch of ingredient names
//
// Phase P3 of claudedocs/design_beo_order_guide_2026-09-15.md. Both are the SAME job
// shape as process-menu: a model drafts, a human confirms, and nothing downstream may
// use a draft. The per-BEO order list (P4) stays pure arithmetic with no model call —
// that is the whole reason inference is pushed out here, where it runs once per dish
// and once per ingredient, behind a review.
//
// Batches come from the browser (a few dishes, a few dozen names per request) so each
// request finishes well inside the ~150s gateway limit and a failure costs one batch.

import "jsr:@supabase/functions-js@^2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
// Text in, JSON out — the same kind of call as the other gemini-3-flash-preview sites.
// The 2.5-flash exception in process-menu/process-beo is for multimodal PDF reads only.
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Must match the CHECK constraint on menu_dishes.spec_basis — a value outside it fails
// the whole batch's write.
const BASES = ['person', 'each', 'piece', 'dozen', 'tray', 'lb'];

// Every value here must be in dish_ingredients.portion_unit's CHECK (oz, lb, floz,
// each). Unit spellings a model reliably produces for those four. Anything else
// (cup, tbsp, g) is NOT converted here: a volume-to-weight guess is exactly the density
// problem design §7 forbids, so the line is dropped and named in the spec's note.
const UNIT_ALIASES: Record<string, string> = {
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  floz: 'floz', 'fl oz': 'floz', 'fl. oz': 'floz', 'fluid ounce': 'floz', 'fluid ounces': 'floz',
  each: 'each', ea: 'each', ct: 'each', count: 'each', piece: 'each', pieces: 'each',
};

// ---------------------------------------------------------------------------------
// Gemini — one deadline for all attempts, retrying only the overload codes.
// ---------------------------------------------------------------------------------

// Gemini now and then returns malformed JSON (2 of ~60 calls, 2026-10-09) and the whole
// batch 500s. A fresh call parses, so it is retried ONCE — only a parse failure, never an
// API error or a timeout, and only inside the same 130s budget, so the retry can never
// carry a request past the gateway limit. Tested by retry_test.ts.
const GEMINI_BUDGET_MS = 130000;

async function callGemini(prompt: string): Promise<any> {
  const started = Date.now();
  try {
    return await callGeminiOnce(prompt, GEMINI_BUDGET_MS);
  } catch (err) {
    const left = GEMINI_BUDGET_MS - (Date.now() - started);
    if (!(err instanceof SyntaxError) || left < 30000) throw err;
    console.warn(`Gemini returned malformed JSON; retrying once: ${err.message}`);
    return await callGeminiOnce(prompt, left);
  }
}

async function callGeminiOnce(prompt: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  let res: Response;
  try {
    // 503 "high demand" / 429 come back in ~2s and cleared on retry for 10 of 15 menus
    // on 2026-09-23 (see process-menu). Nothing else is worth retrying.
    for (let attempt = 1; ; attempt++) {
      res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // NO temperature. process-menu pins 0 on gemini-2.5-flash, but Gemini 3 is
          // documented to LOOP below its default of 1.0 — and here it did: two dishes
          // at temperature 0 ran into the 130s deadline (2026-09-27). Latency is
          // steered with thinkingLevel instead; a human confirms every row anyway.
          generationConfig: {
            response_mime_type: "application/json",
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
      });
      const overloaded = res.status === 503 || res.status === 429;
      if (!overloaded || attempt >= 5 || Date.now() - started > 40000) break;
      console.warn(`Gemini ${res.status} on attempt ${attempt}; retrying`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error(`Gemini timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res!.ok) throw new Error(`Gemini API Error: ${await res!.text()}`);

  const data = await res!.json();
  // A thinking model interleaves reasoning parts with the answer, so take the text
  // part that is NOT a thought rather than assuming index 0 (see kitchen-assistant).
  const parts = data.candidates?.[0]?.content?.parts || [];
  const answer = parts.filter((p: any) => p.text && !p.thought).pop()?.text;
  if (!answer) throw new Error("Gemini returned empty output");
  return JSON.parse(answer);
}
// end of gemini call

// ---------------------------------------------------------------------------------
// Mode "ingredients"
// ---------------------------------------------------------------------------------

// The basis is DERIVED, never asked of the model: it is a fact already on the dish
// (what its price buys), and letting the model pick it would make the unit P4
// multiplies by non-deterministic. A dish with no price of its own is part of a
// per-person package; one priced by "serves N" alone is a whole tray.
function basisFor(dish: any): string {
  if (dish.price_unit && BASES.includes(dish.price_unit)) return dish.price_unit;
  if (dish.serves) return 'tray';
  return 'person';
}

function basisPhrase(dish: any, basis: string): string {
  switch (basis) {
    case 'person': return 'ONE GUEST';
    case 'tray':   return dish.serves ? `ONE WHOLE TRAY/PLATTER (it serves ${dish.serves})` : 'ONE WHOLE TRAY/PLATTER';
    case 'dozen':  return 'ONE DOZEN';
    case 'lb':     return 'ONE POUND of the finished dish as sold';
    default:       return 'ONE PIECE';
  }
}

const INGREDIENTS_PROMPT = `
You are the executive chef of a private country club's banquet kitchen, writing the
purchasing spec for catering dishes. The kitchen cooks from scratch and buys from a
broadline foodservice distributor. For EACH dish below, list what must be BOUGHT to
produce exactly the portion basis stated for that dish.

Return ONLY a JSON array, one element per dish, in this shape:
{
  "dish_id": string,                 // copied exactly from the input
  "ingredients": [ { "name": string, "qty": number, "unit": "oz"|"lb"|"floz"|"each" } ],
  "note": string|null                // what the spec knowingly leaves out (rules 6-8)
}

RULES

1. PER THE STATED BASIS. Every qty is for ONE unit of that dish's basis — one guest,
   one piece, one dozen, one whole tray. Never for a batch, never for 10 or 100.

2. RAW INGREDIENTS, AS PURCHASED. List what the kitchen buys, never a sub-recipe:
   "house marinara" becomes canned tomatoes, onion, garlic, olive oil, basil; a house
   brownie becomes flour, sugar, cocoa, butter, eggs. Quantities are AS PURCHASED,
   before trimming or cooking: a 6 oz cooked chicken portion needs about 7.5 oz raw.

3. UNITS. Only these four:
   - "oz"   — anything bought by weight (meat, fish, produce, cheese, flour, sugar,
              spices, pasta, rice). The default.
   - "lb"   — only when the amount per basis is 1 lb or more.
   - "floz" — liquids bought by volume (oils, vinegar, cream, milk, stock, wine,
              juice, dressings bought ready-made). 1 cup = 8 floz, 1 tbsp = 0.5 floz.
   - "each" — ONLY items bought and used by the count: eggs, buns, rolls, tortillas,
              hot dogs, bratwursts, lemons, limes.
   Never cups, tablespoons, teaspoons, grams or "pinch". Dry spices and herbs go in oz
   by weight (1 tsp of ground spice is about 0.1 oz).

4. REALISTIC CLUB BANQUET PORTIONS. A plated entrée protein is a full portion. The
   dish's own wording wins: "12oz Beef Ribeye" is 12 oz; "3-piece jumbo shrimp" is 3.
   CUSTOM BUFFETS: the package is 1 salad, 2 sides, 2 entrées and 1 dessert, and a
   guest takes some of EACH — so size a buffet entrée or side as ONE OF TWO, not as a
   full plate of that item alone.

5. A NAMED PACKAGE (a themed buffet whose description lists its foods) is specced FLAT:
   every listed food's raw ingredients, per guest, sized as one complete meal. Skip an
   "Optional: Sub ..." substitution (it replaces food, it does not add it), beverages,
   and service notes such as cups and lids — and name them in note.

6. FLAVOUR CHOICES: when the description offers flavours or varieties to choose from
   ("Espresso, Blueberry Lemon, Turtle, or Amaretto"), spec ONLY the shared base and
   put "Flavour ingredients not included: ..." in note.

7. PROTEIN CHOICES: when the description offers a choice of main protein ("Choice of
   Mahi Mahi, Swordfish, or Red Snapper"), spec it with the FIRST one listed and put
   "Specced with <first>; <others> substitute" in note.

8. ADD-ONS such as "Add Chicken +$5" are optional upgrades, not part of the dish. Leave
   them out and name them in note.

9. NAMES are short, generic, lowercase, and what a distributor catalog would call the
   item: "chicken breast", "heavy cream", "all-purpose flour", "yellow onion",
   "parmesan cheese". No brands, no preparation words ("diced", "roasted"). Never list
   water. One row per ingredient per dish — merge repeats.

10. Accompaniments named in a dish's description ("Served with Wild Rice and House
    Marinara") ARE part of that dish — include them.

11. EXISTING NAMES (below) are spellings already in use — NOT a list of allowed foods.
    Reuse one ONLY when it is the SAME food: the same animal and cut, the same plant,
    the same product. Anything else gets a NEW name; new names are expected and normal.
    NEVER substitute a different food for the one the dish names, however close: veal
    is never pork, a ribeye is never a strip loin, cashews are never peanuts, provolone
    is never mozzarella, Dijon is never grain mustard, cream sherry is never white wine.

12. EVERY FOOD THE DISH NAMES IS LISTED UNDER ITS OWN NAME — the foods in its name
    ("Hazelnut-Crusted Trout" needs hazelnuts and trout) and in its description
    ("Gruyère" is gruyere cheese, "panko" is panko, "Kalamata" is kalamata olives).
    A variety the dish names is its own ingredient, never the generic or a sibling.
    If you ever use a stand-in anyway, say so in note — but a stand-in is a mistake.

13. HOUSE RECIPE. Some dishes come with the kitchen's own recipe, and the recipes it uses.
    That recipe IS the dish: its ingredients exactly — none added, none swapped — and its
    portion is the portion (rule 4 does not resize it). For such a dish return "recipes"
    INSTEAD of "ingredients", one element per recipe given with the dish:
      "recipes": [ { "title": string, "called": number, "yield": number, "within": string|null,
                     "ingredients": [ { "name": string, "qty": number, "unit": ... } ] } ]
    - title: copied exactly from the input — the title alone, not the line printed under it.
      A recipe's own sections (its sauce, glaze, jus, custard, crust) stay in ITS element;
      only a recipe given with its own title gets an element of its own.
    - ingredients: that recipe's WHOLE BATCH as written — every line at its full amount.
      Do NOT divide or scale anything; that is done for you. Rule 3 holds: butter, herbs,
      garlic, shallots, breadcrumbs, sugar, nuts, spices and pastes are bought by WEIGHT,
      so a cup or spoon of them becomes oz, never floz — floz is for liquids. A line
      counted but sized by weight ("1 each whole ribeye roll, 15 to 16 lb") is its weight,
      the larger figure of a range. The recipe's words name the food (rule 11): brioche is
      brioche, acorn squash is acorn squash — never the butternut squash already on the
      list — heirloom carrots are heirloom carrots, never plain carrot, and smoked paprika
      is smoked paprika. Zest is bought as its fruit: lemon zest is lemons (each). A
      recipe is never "mapped" to a listed name: a food the list lacks gets a new name.
      Water, including a brine's water, is never an ingredient. A line that IS one of the given recipes
      ("3 cups Maple Cider Vinaigrette (sub-recipe)") is not an ingredient: leave it out
      of the batch — its own element lists what it is made of.
    - called, yield, within: how much of this recipe ONE portion uses, as two numbers
      COPIED from the page — never divide them yourself. called and yield in one unit.
        the dish's own recipe ("25 portions"):             called 1, yield 25, within null
        a side ON THE PLATE at "3 oz" whose recipe makes
          "25 portions, 3 oz each" (75 oz):                 called 3, yield 75, within null
        "1 square" of a recipe cut into 25:                called 1, yield 25, within null
        a line "3 cups Maple Cider Vinaigrette" in the salad's batch, the vinaigrette
          making "About 3 1/2 cups":    called 3, yield 3.5, within "<the salad's title>"
      within is the title of the recipe whose BATCH lists this one, or null when the
      amount is per portion of the dish. A given recipe the dish does not use: called 0.
    - Leave out water, "to taste" or "as needed" lines with no amount, and anything the
      recipe marks optional — name the optional ones in note. Where a line offers a
      choice ("brioche or country French bread"), use the first.

Do not wrap the output in markdown code fences.
`;

interface CleanSpec {
  dish_id: string;
  basis: string;
  note: string | null;
  ingredients: { name: string; qty: number; unit: string }[];
}

// Coerce one model-emitted spec into the table's shape. The model can return anything,
// and a single bad unit would fail the CHECK constraint and take the whole batch down —
// so each line is checked here, and whatever cannot be used is NAMED in the note rather
// than silently dropped (NFR-3: never silently wrong).
function cleanSpec(raw: any, dish: any): CleanSpec {
  const kept = new Map<string, { name: string; qty: number; unit: string }>();
  const dropped: string[] = [];

  for (const ing of Array.isArray(raw?.ingredients) ? raw.ingredients : []) {
    const name = typeof ing?.name === 'string' ? ing.name.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    const qty = typeof ing?.qty === 'string' ? parseFloat(ing.qty) : ing?.qty;
    const unit = UNIT_ALIASES[String(ing?.unit ?? '').trim().toLowerCase()];
    if (!name) continue;
    if (!unit || typeof qty !== 'number' || !isFinite(qty) || qty <= 0) {
      dropped.push(`${name} (${ing?.qty ?? '?'} ${ing?.unit ?? '?'})`);
      continue;
    }
    const prev = kept.get(name);
    if (!prev) {
      kept.set(name, { name, qty, unit });
    } else if (prev.unit === unit) {
      // The unique (dish_id, ingredient_name) key would reject a repeat; the same
      // ingredient twice in one dish is one purchase, so it is summed.
      kept.set(name, { ...prev, qty: prev.qty + qty });
    } else {
      dropped.push(`${name} (a second amount in ${unit})`);
    }
  }

  // 4 places keeps a pinch from a sub-recipe (nutmeg, 0.0004 oz a guest). Anything smaller
  // rounds to 0, which portion_qty's > 0 CHECK rejects along with the whole batch (the Short
  // Rib's purée nutmeg did, 2026-10-14) — so it is left out and named, not saved as 0.
  const rounded = [...kept.values()].map(i => ({ ...i, qty: Math.round(i.qty * 10000) / 10000 }));
  const tooSmall = rounded.filter(i => i.qty === 0).map(i => i.name);

  const notes = [typeof raw?.note === 'string' ? raw.note.trim() : '']
    .concat(dropped.length ? [`Model gave unusable amounts for: ${dropped.join(', ')}`] : [])
    .concat(tooSmall.length ? [`Too small to order per portion: ${tooSmall.join(', ')}`] : [])
    .filter(Boolean);

  return {
    dish_id: dish.id,
    basis: basisFor(dish),
    note: notes.length ? notes.join(' · ') : null,
    ingredients: rounded.filter(i => i.qty > 0),
  };
}

// The books write a buffet entrée as a full single-entrée portion and say most guests on
// a 2-entrée buffet take 60-70% of each; the owner set 65% (2026-10-14). Buffet sides are
// already written at side portions and are left as the book has them.
const BUFFET_ENTREE_SHARE = 0.65;

// A house-recipe dish comes back as whole batches plus, per recipe, two numbers copied off
// the page (rule 13), and every division is done HERE. Asked to divide and sum itself, the
// model got each main-recipe line right and the cross-recipe ones wrong — crouton bread 34%
// low, a third recipe's butter dropped; handed one share to compute per recipe, it still
// put the candied pecans at 2.7% of the batch, not 12/28 x 4% = 1.7% (2026-10-14 dry runs).
// Copying numbers it does reliably; dividing them it does not.
// Returns the ordinary { ingredients, note } shape, so cleanSpec still checks every unit
// and sums a name that several recipes share. A share that cannot be worked out, or a
// recipe that is not one of the dish's, is left out and NAMED in the note — never guessed.
// Tested by house_recipe_test.ts.
//
// The model also renames and splits recipes, so a title is matched by what it MEANS:
//  - "Boneless Braised Beef Short Rib (7 oz) with Red Wine Pan Reduction" (title + the
//    subtitle printed under it) is the Short Rib recipe — exact matching lost its beef;
//  - "Bourbon Maple Glaze", a SECTION of the Pecan-Crusted Salmon recipe sent back as a
//    recipe of its own, is counted with that recipe at that recipe's share — dropping it
//    lost the salmon's glaze and the pork loin's whole pan jus (2026-10-14 drafts).
// And the dish's own recipe takes its share from its own "25 portions" yield, not from the
// model: the soup came back as 6 of 160 oz (3.75%), not 1 of 25.
// "Leek & Gruyère Bread Pudding" and "leek and gruyere bread pudding" alike: no case,
// accents or punctuation, and "&" read as "and".
const foodKey = (name: unknown) => String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const toNumber = (v: unknown) => typeof v === 'string' ? parseFloat(v) : v;

// The book's portion count for a recipe ("YIELD" then "25 portions, ..."), or null for a
// sub-recipe whose yield is an amount ("About 3 1/2 cups").
function portionsOf(recipe: any): number | null {
  const m = /^YIELD\s*\n\s*(\d+)\s+portions\b/im.exec(recipe?.recipe_text || '');
  return m ? Number(m[1]) : null;
}

// Which of the dish's recipes a title means: the same name, or the name with more after it.
function recipeNamed(title: unknown, recipes: any[]): any | null {
  const k = foodKey(title);
  if (!k) return null;
  return recipes
    .filter((r: any) => k === foodKey(r.title) || k.startsWith(foodKey(r.title) + ' '))
    .sort((a: any, b: any) => foodKey(b.title).length - foodKey(a.title).length)[0] ?? null;
}

// The dish's recipe that has a section by this name ("Bourbon maple glaze (makes ...)").
function recipeWithSection(title: unknown, recipes: any[]): any | null {
  const k = foodKey(title);
  if (!k) return null;
  return recipes.find((r: any) => ` ${foodKey(r.recipe_text)} `.includes(` ${k} `)) ?? null;
}

// The share of a recipe's batch in ONE portion, read off the BOOK where it can be: the
// dish's own recipe is 1 of its portions; any other recipe is named on a line of another
// of the dish's recipes — "3 oz Roasted Acorn Squash Purée" ON THE PLATE (that much per
// portion) or "3 cups Horseradish Sauce (sub-recipe)" among the INGREDIENTS (that much
// per batch of the recipe it goes into) — and its own YIELD says how much a batch makes.
// The model's copied numbers are only the fallback: on the 2026-10-14 drafts they put the
// Short Rib's plate sides INSIDE the rib (0.2%, not 4%) and the horseradish at 3 cups of
// a yield it wrote in fl oz (0.5%, not 3.7%). null when neither source gives a 0-1 share.
function shareOf(title: string, answers: Map<string, any>, recipes: any[]): { share: number, from: 'book' | 'model' } | null {
  const book = bookShare(title, recipes, new Set());
  if (book !== null) return { share: book, from: 'book' };
  const model = modelShare(title, answers, recipes, new Set());
  return model === null ? null : { share: model, from: 'model' };
}

// Amounts as the books print them ("3", "1/2", "3 1/2", "2.5") and each unit's kind and
// size in oz (weight) or fl oz (volume).
const BOOK_UNITS: Record<string, [string, number]> = {
  oz: ['weight', 1], ounce: ['weight', 1], ounces: ['weight', 1],
  lb: ['weight', 16], lbs: ['weight', 16], pound: ['weight', 16], pounds: ['weight', 16],
  tsp: ['volume', 1 / 6], tbsp: ['volume', 0.5], cup: ['volume', 8], cups: ['volume', 8],
  pint: ['volume', 16], pints: ['volume', 16], qt: ['volume', 32], quart: ['volume', 32], quarts: ['volume', 32],
  gal: ['volume', 128], gallon: ['volume', 128], gallons: ['volume', 128],
  each: ['count', 1], square: ['count', 1], squares: ['count', 1], piece: ['count', 1], pieces: ['count', 1],
  slice: ['count', 1], slices: ['count', 1],
};
const MEASURE = new RegExp(String.raw`(\d+\s+\d+/\d+|\d+/\d+|\d*\.\d+|\d+)\s+(` + Object.keys(BOOK_UNITS).join('|') + String.raw`)\b`, 'gi');
const LABELS = new Set(['YIELD', 'USED ON', 'ALLERGENS', 'ON THE PLATE', 'INGREDIENTS']);

function bookAmount(text: string): number {
  return text.trim().split(/\s+/).reduce((sum, part) => {
    const [a, b] = part.split('/').map(Number);
    return sum + (b ? a / b : a);
  }, 0);
}

// The measurements in a piece of book text, in order, as { kind, value }. Adjacent ones of
// one kind are ONE amount: "1 lb 12 oz" is 28 oz, while "3 oz (about 5 lb)" is two.
function bookMeasures(text: string): { kind: string, value: number }[] {
  const found: { kind: string, value: number, end: number }[] = [];
  for (const m of text.matchAll(MEASURE)) {
    const [kind, size] = BOOK_UNITS[m[2].toLowerCase()];
    const value = bookAmount(m[1]) * size;
    const prev = found[found.length - 1];
    if (prev && prev.kind === kind && /^\s*$/.test(text.slice(prev.end, m.index))) {
      prev.value += value;
      prev.end = m.index! + m[0].length;
    } else {
      found.push({ kind, value, end: m.index! + m[0].length });
    }
  }
  return found.map(({ kind, value }) => ({ kind, value }));
}

// The lines under one of a recipe's labels, up to the next label.
function bookSection(recipe: any, label: string): string[] {
  const lines = String(recipe?.recipe_text ?? '').split(/\r?\n/);
  const start = lines.findIndex(l => l.trim() === label);
  if (start < 0) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(l => LABELS.has(l.trim()));
  return end < 0 ? rest : rest.slice(0, end);
}

// How much one batch of a recipe makes, in the kind of unit it is called for in:
// "25 portions, 3 oz each" is 25 by the count and 75 oz by weight; "About 3 1/2 cups" is 28 fl oz.
function bookBatch(recipe: any, kind: string): number | null {
  const text = bookSection(recipe, 'YIELD').join(' ');
  const portions = /(\d+)\s+portions\b/i.exec(text);
  if (portions) {
    if (kind === 'count') return Number(portions[1]);
    const size = bookMeasures(text.slice(portions.index + portions[0].length)).find(m => m.kind === kind);
    return size ? Number(portions[1]) * size.value : null;
  }
  return bookMeasures(text).find(m => m.kind === kind)?.value ?? null;
}

function bookShare(title: string, recipes: any[], seen: Set<string>): number | null {
  const recipe = recipes.find((r: any) => r.title === title);
  if (!recipe) return null;
  if (recipe.depth === 0) return portionsOf(recipe) ? 1 / portionsOf(recipe)! : null;
  const named = ` ${foodKey(title)} `;
  for (const parent of recipes) {
    if (parent.title === title) continue;
    for (const [label, perPortion] of [['ON THE PLATE', true], ['INGREDIENTS', false]] as const) {
      const line = bookSection(parent, label).find(l => ` ${foodKey(l)} `.includes(named));
      if (!line) continue;
      const called = bookMeasures(line)[0];
      const batch = called ? bookBatch(recipe, called.kind) : null;
      if (!called || !batch) return null;
      const share = called.value / batch;
      if (!(share > 0 && share <= 1)) return null;
      // ON THE PLATE is per portion of the dish, so it counts only on the dish's own recipe.
      if (perPortion) return parent.depth === 0 ? share : null;
      if (seen.has(parent.title)) return null;
      const parentShare = bookShare(parent.title, recipes, new Set([...seen, title]));
      return parentShare === null ? null : share * parentShare;
    }
  }
  return null;
}

// The model's numbers: called / yield, times the share of the recipe it says it goes into.
function modelShare(title: string, answers: Map<string, any>, recipes: any[], seen: Set<string>): number | null {
  const recipe = recipes.find((r: any) => r.title === title);
  if (recipe?.depth === 0 && portionsOf(recipe)) return 1 / portionsOf(recipe)!;
  const answer = answers.get(title);
  const called = toNumber(answer?.called), yieldOf = toNumber(answer?.yield);
  if (typeof called !== 'number' || typeof yieldOf !== 'number' || !isFinite(called) || !isFinite(yieldOf)
      || called < 0 || yieldOf <= 0 || called > yieldOf) return null;
  const share = called / yieldOf;
  if (answer.within == null || answer.within === '') return share;
  const parent = recipeNamed(answer.within, recipes);
  if (!parent || parent.title === title || seen.has(parent.title)) return null;
  const parentShare = modelShare(parent.title, answers, recipes, new Set([...seen, title]));
  return parentShare === null ? null : share * parentShare;
}

function flattenHouseRecipes(raw: any, recipes: any[]): any {
  if (recipes.length === 0 || !Array.isArray(raw?.recipes)) return raw;
  const subRecipes = new Set(recipes.map((r: any) => foodKey(r.title)));
  const answers = new Map<string, any>();                  // the dish's recipe title -> its element
  const sections: { answer: any, of: string }[] = [];
  const problems: string[] = [];
  for (const answer of raw.recipes) {
    const named = recipeNamed(answer?.title, recipes);
    if (named) { if (!answers.has(named.title)) answers.set(named.title, answer); continue; }
    const holder = recipeWithSection(answer?.title, recipes);
    if (holder) sections.push({ answer, of: holder.title });
    else problems.push(`"${answer?.title}" is not one of this dish's recipes`);
  }

  const ingredients: any[] = [];
  const used: string[] = [];
  const add = (answer: any, share: number) => {
    for (const ing of Array.isArray(answer?.ingredients) ? answer.ingredients : []) {
      // A batch's "3 cups Maple Cider Vinaigrette" line is that recipe, already expanded
      // into its own ingredients — kept, it would be ordered twice (all 4 dishes of the
      // 2026-10-14 dry run listed their sub-recipes as lines despite the prompt).
      if (subRecipes.has(foodKey(ing?.name))) continue;
      const qty = toNumber(ing?.qty);
      // A bad amount is passed through untouched so cleanSpec drops it and names it.
      if (typeof qty !== 'number' || !isFinite(qty)) { ingredients.push(ing); continue; }
      // Batches are written in lb, one guest's share of them is ounces: all weights go
      // to oz, so carrots in lb from one recipe and oz from another still sum (cleanSpec
      // drops a name that arrives in two units).
      const pounds = String(ing?.unit ?? '').trim().toLowerCase().replace(/s$/, '') === 'lb';
      ingredients.push({ ...ing, qty: qty * share * (pounds ? 16 : 1), unit: pounds ? 'oz' : ing.unit });
    }
  };
  for (const [title, answer] of answers) {
    const found = shareOf(title, answers, recipes);
    if (found === null) {
      problems.push(`${title} (${answer?.called ?? '?'} of ${answer?.yield ?? '?'}${answer?.within ? ` within ${answer.within}` : ''})`);
      continue;
    }
    if (found.share === 0) continue;
    used.push(`${title} ${Math.round(found.share * 1000) / 10}%${found.from === 'model' ? " (not in the book's lines: the model's numbers)" : ''}`);
    add(answer, found.share);
  }
  const folded: string[] = [];
  for (const { answer, of } of sections) {
    const found = shareOf(of, answers, recipes);
    if (found === null || found.share === 0) { problems.push(`"${answer?.title}" (a section of ${of})`); continue; }
    folded.push(`${answer.title} (with ${of})`);
    add(answer, found.share);
  }

  const missed = recipes.map((r: any) => r.title).filter((t: string) => !answers.has(t));
  const notes = [
    typeof raw.note === 'string' ? raw.note.trim() : '',
    used.length ? `Per portion, from the recipe book: ${used.join(' + ')} of each batch` : '',
    folded.length ? `Counted as part of their recipe: ${folded.join(', ')}` : '',
    problems.length ? `Left out, unusable share: ${problems.join(', ')}` : '',
    missed.length ? `Model skipped: ${missed.join(', ')}` : '',
  ].filter(Boolean);
  return { ...raw, ingredients, note: notes.join(' · ') || null };
}

// A buffet entrée takes its share of the book's single-entrée portion. A house-recipe dish
// the model answered the old way (one flat list, no shares) is flagged for a closer look.
function fromHouseRecipe(spec: CleanSpec, dish: any, raw: any, recipes: any[]): CleanSpec {
  if (recipes.length === 0) return spec;
  const buffetEntree = /buffet entr/i.test(dish.menu_section || '');
  const notes = [
    spec.note,
    Array.isArray(raw?.recipes) ? null : `Recipe book given, but the model did not split it by recipe — check every amount.`,
    buffetEntree ? `Buffet entrée: ${BUFFET_ENTREE_SHARE * 100}% of the book's single-entrée portion.` : null,
  ].filter(Boolean);
  return {
    ...spec,
    note: notes.join(' · ') || null,
    ingredients: buffetEntree
      ? spec.ingredients.map(i => ({ ...i, qty: Math.round(i.qty * BUFFET_ENTREE_SHARE * 10000) / 10000 }))
      : spec.ingredients,
  };
}
// end of house recipe helpers

async function draftIngredients(db: any, payload: any) {
  const dishIds: string[] = Array.isArray(payload.dishIds) ? payload.dishIds : [];
  if (dishIds.length === 0) throw new Error("dishIds is required");
  if (dishIds.length > 12) throw new Error("At most 12 dishes per request");

  // Only orderable dishes: a price rule or an unconfirmed dish must never get food.
  const { data: dishes, error } = await db
    .from('orderable_menu_dishes')
    .select('id, name, menu_source, menu_section, description, price_unit, price_qty, serves, min_order, season, spec_status')
    .in('id', dishIds);
  if (error) throw error;

  const todo = (dishes || []).filter((d: any) => d.spec_status !== 'confirmed');
  if (todo.length === 0) {
    return { read: 0, written: 0, skipped_confirmed: dishIds.length, missing: [] };
  }

  // Names already in use, so a later batch says "heavy cream" the way an earlier one
  // did — otherwise every synonym becomes one more ingredient to map by hand.
  // Prompt rules 11-12 exist because a bare list here read as a CLOSED vocabulary: on
  // 12 dishes naming foods not yet in it, 2 of 3 runs swapped wholesale (lamb -> pork
  // tenderloin, halibut -> salmon, lobster -> shrimp) and coined 0 new names (2026-10-08).
  // With 11-12: 32-35 of 36 named foods kept in 5 of 5 runs. Still seen: pecans ->
  // walnuts in 3 of 5, now always said in the note — never tell the model to keep a
  // substitution out of the note: that made them silent.
  const { data: vocab, error: vocabError } = await db.rpc('dish_ingredient_names');
  if (vocabError) throw vocabError;
  const existing = (vocab || []).map((r: any) => r.ingredient_name);

  // The kitchen's own recipe for a dish, when its season's book is loaded (house_recipes):
  // depth 0 is the dish itself, deeper rows the sides and sub-recipes it uses (rule 13).
  const { data: houseRows, error: houseError } = await db.rpc('dish_house_recipes', { p_dish_ids: todo.map((d: any) => d.id) });
  if (houseError) throw houseError;
  const recipesFor = new Map<string, any[]>();
  for (const row of (houseRows || []).sort((a: any, b: any) => a.depth - b.depth)) {
    recipesFor.set(row.dish_id, [...(recipesFor.get(row.dish_id) || []), row]);
  }

  const dishBlock = todo.map((d: any) => {
    const basis = basisFor(d);
    const [own, ...used] = recipesFor.get(d.id) || [];
    return [
      `dish_id: ${d.id}`,
      `name: ${d.name}`,
      `menu: ${d.menu_source}${d.season ? ` (${d.season})` : ''}${d.menu_section ? ` — ${d.menu_section}` : ''}`,
      d.description ? `description: ${d.description}` : null,
      `portion basis: per ${basisPhrase(d, basis)}`,
      own ? `HOUSE RECIPE (rule 13):\n${own.recipe_text}` : null,
      ...used.map((r: any) => `RECIPE IT USES — ${r.title}:\n${r.recipe_text}`),
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  const prompt = INGREDIENTS_PROMPT +
    `\nEXISTING NAMES (rules 11-12 — reuse a spelling only for the SAME food; anything not here gets a new name): ${existing.length ? existing.join('; ') : '(none yet)'}\n` +
    `\nDISHES:\n\n${dishBlock}\n`;

  let parsed = await callGemini(prompt);
  if (!Array.isArray(parsed)) parsed = [parsed];

  const byId = new Map<string, any>(todo.map((d: any) => [d.id, d]));
  const specs: CleanSpec[] = [];
  for (const raw of parsed) {
    const dish = byId.get(raw?.dish_id);
    if (!dish || specs.some(s => s.dish_id === dish.id)) continue;
    const recipes = recipesFor.get(dish.id) || [];
    const spec = fromHouseRecipe(cleanSpec(flattenHouseRecipes(raw, recipes), dish), dish, raw, recipes);
    // An empty list is a failed read, not a dish made of nothing. Leave it unspecced
    // so it shows up as still to do instead of as a draft that claims to cost $0.
    if (spec.ingredients.length > 0) specs.push(spec);
  }
  const missing = todo.filter((d: any) => !specs.some(s => s.dish_id === d.id)).map((d: any) => d.name);

  if (payload.parseOnly === true) {
    return { specs, missing };
  }

  const { data: result, error: saveError } = await db.rpc('save_dish_spec_drafts', { p_specs: specs });
  if (saveError) throw saveError;
  const counts = Array.isArray(result) ? result[0] : result;

  return { read: specs.length, ...counts, missing };
}

// ---------------------------------------------------------------------------------
// Mode "products"
// ---------------------------------------------------------------------------------

const PRODUCTS_PROMPT = `
You are matching a scratch banquet kitchen's ingredient names to its foodservice
distributor's catalog. For EACH ingredient below, choose the ONE catalog product the
kitchen should buy for it, or null when nothing in the catalog is a sensible purchase.

Return ONLY a JSON array, one element per ingredient:
{ "ingredient_name": string,       // copied exactly from the input
  "product_number": string|null,   // the number after "#", copied exactly
  "product_description": string|null, // the text after that number up to the next "|", copied exactly
  "note": string }                 // one short reason, or why nothing fits

RULES
1. Match the FORM a scratch kitchen buys: raw over fully-cooked, fresh over frozen
   unless the item is normally bought frozen, plain over breaded or marinated — unless
   the ingredient name itself says otherwise ("breaded chicken tenders").
2. Each ingredient lists the DISHES that use it, with their menu and portion. Read them to
   decide what the ingredient IS: "cheese" on a charcuterie board and "cheese" in a hot
   dip are different purchases. When its dishes need different forms, choose the one
   that suits most of them and say so in the note. Each dish line ends "with: ..." —
   the dish's OTHER ingredients, which are ordered on their own lines. So match this
   ingredient ALONE, never a prepared product that already contains them: "chicken
   breast" in Chicken Cordon Bleu "with: ham, swiss cheese" is plain chicken breast,
   not a frozen cordon bleu, or the ham and swiss would be bought twice.
3. Each ingredient lists the portion units it is used in. Prefer a product sold in the
   SAME kind of unit: an ingredient used by "each" should be a product sold by count
   (a pack of N buns, eggs by the dozen); by "oz"/"lb" a product sold by weight; by
   "floz" a product sold by volume.
4. PREFER WHAT THIS KITCHEN ALREADY BUYS. Products marked "BOUGHT" are ones the kitchen
   has ordered (a date is its last purchase). When a BOUGHT product fits rules 1-3,
   choose it over an unmarked one, even if the unmarked one reads slightly closer. Choose
   an unmarked product only when no BOUGHT product is a sensible purchase, and then begin
   the note with "NOT BOUGHT BEFORE:" so a reviewer sees it.
5. When several products fit equally, prefer the general-purpose one over a specialty
   cut, and the one that is not a children's or single-serve pack.
6. Never pick a non-food item for a food, and never force a match: a wrong product is
   worse than null, because null shows up as a gap and gets fixed.
7. Do not wrap the output in markdown code fences.
`;

// PostgREST returns at most 1000 rows per request, and the catalog holds 1,381. An
// unpaged read would silently show the model only part of it (this app has been
// burned by exactly that cap before — reference-supabase-silent-wrong-data).
async function loadCatalog(db: any) {
  const all: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('supplier_products')
      .select('id, product_number, description, custom_description, brand, pack_size, category, last_purchased_on, source_lists')
      .eq('is_active', true)
      .order('product_number')
      .range(from, from + 999);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return all;
}

// The dishes an ingredient is used in (prompt rule 2), one indented line each:
//   - Bacon-Wrapped Scallops — Hors d'Oeuvres — 1.25 oz per piece — with: bacon, ...
// "with" is the dish's other ingredients: without it the model matched "scallops" to a
// pre-made bacon-wrapped appetizer, buying the bacon twice (2 of 3 runs, 2026-10-01).
// Both lists are capped so a staple used across most menus (butter, salt) or a themed
// buffet's long spec cannot crowd the batch. Same per-basis wording as the Ingredient
// Products page (BASIS_LABEL in app/src/lib/orderUnits.js).
const DISHES_IN_PROMPT = 8;
const WITH_IN_PROMPT = 12;
const BASIS_WORD: Record<string, string> = { person: 'guest', each: 'each', piece: 'piece', dozen: 'dozen', tray: 'tray', lb: 'lb' };

function dishLines(dishes: any[]): string {
  const lines = dishes.slice(0, DISHES_IN_PROMPT).map((d: any) => {
    const others: string[] = d.with || [];
    const withText = others.length === 0 ? ''
      : ` — with: ${others.slice(0, WITH_IN_PROMPT).join(', ')}${others.length > WITH_IN_PROMPT ? `, and ${others.length - WITH_IN_PROMPT} more` : ''}`;
    return `  - ${d.name} — ${[d.menu, d.season].filter(Boolean).join(', ')} — ` +
      `${Number(d.qty)} ${d.unit === 'floz' ? 'fl oz' : d.unit} per ${BASIS_WORD[d.basis] || d.basis || 'serving'}${withText}`;
  });
  if (dishes.length > DISHES_IN_PROMPT) lines.push(`  - and ${dishes.length - DISHES_IN_PROMPT} more dishes`);
  return lines.join('\n');
}

// The model copies a 5-6 digit product number out of ~1,400 lines, and it miscopies:
// for "watermelon" (#52193) it returned #52167 PEACH TRAY-PACK and #522183 BUTTERNUT
// SQUASH — REAL numbers, so the not-in-catalog check passed them, each with a note
// still reading "Seedless watermelon" (2 of 5 runs, 2026-10-01). So it also copies the
// description, and a pick is kept only when most of the words it wrote are on the
// product it numbered. When they disagree there is no telling which half is wrong,
// so the pick is dropped, never repaired. Tested by match_test.ts.
//
// Numbers must match outright: PFG numbers the sizes of one item side by side (#252175
// SCALLOP 30-40, #252182 SCALLOP 60-80), so a miscopy onto a sibling shares every word
// except its size, and the 60% share alone passed it. Every word the model wrote that
// holds a digit (30, 40, 4X4, the 6 of "6 OUNCE") must be on the product.
function words(s: string): string[] {
  return s.toUpperCase().match(/[A-Z0-9]+/g) || [];
}

function describesProduct(said: string, product: any): boolean {
  const saidWords = new Set(words(said));
  if (saidWords.size === 0) return false;
  const actual = new Set(words(`${product.custom_description ?? ''} ${product.description ?? ''} ${product.brand ?? ''}`));
  let found = 0;
  for (const w of saidWords) {
    if (actual.has(w)) found++;
    else if (/\d/.test(w)) return false;
  }
  return found / saidWords.size >= 0.6;
}
// end of match helpers

async function draftProducts(db: any, payload: any) {
  const names: string[] = Array.isArray(payload.names)
    ? [...new Set(payload.names.map((n: any) => String(n).trim().toLowerCase()).filter(Boolean))] as string[]
    : [];
  if (names.length === 0) throw new Error("names is required");
  if (names.length > 60) throw new Error("At most 60 ingredient names per request");

  const { data: usage, error: usageError } = await db
    .from('ingredient_usage')
    .select('ingredient_name, units, mapping_status, dishes')
    .in('ingredient_name', names);
  if (usageError) throw usageError;

  // A confirmed mapping is never re-asked (FR-12); the RPC enforces it too, but there
  // is no reason to spend model time on it.
  const todo = (usage || []).filter((u: any) => u.mapping_status !== 'confirmed');
  if (todo.length === 0) return { read: 0, inserted: 0, updated: 0, skipped_confirmed: names.length, missing: [] };

  const catalog = await loadCatalog(db);
  const byNumber = new Map(catalog.map((p: any) => [p.product_number, p]));

  // Bought products are listed first and marked, so the model meets them before the rest
  // (prompt rule 4). Only bought products carry a mark — tagging the other half too would
  // add tokens and no signal. "Bought" = a recorded last purchase, or membership of the
  // order guides' own "Purchase History" list for a product the worksheet has not dated.
  const boughtTag = (p: any) =>
    p.last_purchased_on ? ` | BOUGHT ${p.last_purchased_on}`
      : (p.source_lists || []).includes('Purchase History') ? ' | BOUGHT' : '';
  const ordered = [...catalog].sort((a: any, b: any) => (boughtTag(a) ? 0 : 1) - (boughtTag(b) ? 0 : 1));
  const catalogBlock = ordered.map((p: any) =>
    `#${p.product_number} | ${p.custom_description ? p.custom_description + ' / ' : ''}${p.description}` +
    `${p.brand ? ' | ' + p.brand : ''} | ${p.pack_size} | ${p.category ?? ''}${boughtTag(p)}`
  ).join('\n');
  const ingredientBlock = todo.map((u: any) =>
    `${u.ingredient_name}  (used in: ${(u.units || []).join(', ')})\n${dishLines(u.dishes || [])}`
  ).join('\n');

  const prompt = PRODUCTS_PROMPT +
    `\nINGREDIENTS:\n${ingredientBlock}\n\nCATALOG (${catalog.length} products):\n${catalogBlock}\n`;

  let parsed = await callGemini(prompt);
  if (!Array.isArray(parsed)) parsed = [parsed];

  const wanted = new Set(todo.map((u: any) => u.ingredient_name));
  const rows: { ingredient_name: string; product_id: string | null; ai_note: string | null }[] = [];
  for (const raw of parsed) {
    const name = typeof raw?.ingredient_name === 'string' ? raw.ingredient_name.trim().toLowerCase() : '';
    if (!wanted.has(name) || rows.some(r => r.ingredient_name === name)) continue;
    const number = raw?.product_number == null ? null : String(raw.product_number).replace(/^#/, '').trim();
    const product = number ? byNumber.get(number) : null;
    // A number that is not in the catalog is an invented product, and one whose
    // description disagrees is a miscopy. Both become null with the reason attached,
    // never a guessed nearest match.
    const note = typeof raw?.note === 'string' ? raw.note.trim() : null;
    const said = typeof raw?.product_description === 'string' ? raw.product_description.trim() : '';
    let productId: string | null = product ? product.id : null;
    let aiNote = note;
    if (number && !product) {
      aiNote = `Model named #${number}, which is not in the catalog. ${note ?? ''}`.trim();
    } else if (product && !describesProduct(said, product)) {
      productId = null;
      aiNote = `Model named #${number} (${product.description}) but described "${said || 'nothing'}" — ` +
        `not saved, pick by hand. ${note ?? ''}`.trim();
    }
    rows.push({ ingredient_name: name, product_id: productId, ai_note: aiNote });
  }
  const missing = [...wanted].filter(n => !rows.some(r => r.ingredient_name === n));

  if (payload.parseOnly === true) return { rows, missing };

  const { data: result, error: saveError } = await db.rpc('upsert_ingredient_product_drafts', { p_rows: rows });
  if (saveError) throw saveError;
  const counts = Array.isArray(result) ? result[0] : result;

  return { read: rows.length, ...counts, missing };
}

// ---------------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const started = Date.now();

    let result;
    if (payload.mode === 'ingredients') result = await draftIngredients(db, payload);
    else if (payload.mode === 'products') result = await draftProducts(db, payload);
    else throw new Error('mode must be "ingredients" or "products"');

    return new Response(
      JSON.stringify({ success: true, mode: payload.mode, ms: Date.now() - started, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("draft-dish-specs failed:", err);
    return new Response(JSON.stringify({ error: String((err as any)?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
