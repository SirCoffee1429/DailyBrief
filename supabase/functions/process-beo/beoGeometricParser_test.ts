// Checks the BEO table assembler on rows copied from real packets (gap, x, font, text).
// Run: deno test --allow-read --allow-env supabase/functions/process-beo/beoGeometricParser_test.ts
//
// The packets themselves stay out of the repo (member contact details, gitignored
// `BEOs/`), so each fixture keeps only the table rows an assertion needs, with the
// contact rows left out. Fonts are the packet's own pdf.js names: f3 is the heading font
// (the section header's `Qty` cell, category headers, left labels), f4 the body font, f5
// the italic note font. Not bundled on deploy: only what index.ts imports ships.
import { assemble, type Row } from "./beoGeometricParser.ts";

const H = "g_d0_f3";   // heading font = the Qty cell's
const B = "g_d0_f4";   // body font
const N = "g_d0_f5";   // note font

// One printed row: its gap to the row above and its cells as [x, font, text].
const row = (gap: number, ...cells: [number, string, string][]): Row =>
  ({ y: 0, gap, cells: cells.map(([x, font, text]) => ({ x, font, text })) });

const footer = (key: string) => row(30, [36, B, "Page"], [300, B, key]);

function expect(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const categories = (pages: Row[][]) => assemble(pages)[0].sections.flatMap((s) => s.categories);

// Screaming Eagle Dinner Club, 11/17 packet p6: a Street Dinner plated as ONE item whose
// courses sit on rows of their own (gap ~24) with no label and no qty. The dessert is
// the last course, and the next row carries a label ("Allergies!!"), which is the shape
// the label rule alone reads as a category header.
const streetDinner = [[
  row(99, [409, H, "Screaming Eagle Dinner Club"]),
  row(25, [42, H, "Event Headcount"], [558, B, "14"]),
  row(16, [42, H, "Event Date(s)"], [445, B, "11/17/2026 - 11/17/2026"]),
  row(16, [50, H, "Tue, 11/17/2026"], [262, H, "Dinner - 6:00pm - Tack Room"], [536, H, "Qty"]),
  row(17, [294, H, "Street Dinner"]),
  row(17, [40, H, "Plated Food"], [266, B, "Autumn Bitter Greens Salad"], [538, B, "14"]),
  row(12, [161, B, "Radicchio & Endive, Warm Bacon Vinaigrette, Candied Pecans, Shaved Pecorino"]),
  row(24, [274, B, "Roasted Airline Chicken"]),
  row(12, [203, B, "Wild Mushroom Cream, Wild Rice Pilaf, Roasted Broccolini"]),
  row(23, [276, B, "Pumpkin Pot de Creme"]),
  row(13, [256, B, "Maple Chantilly, Candied Pecans"]),
  row(17, [40, H, "Allergies!!"], [301, B, "Libby Reid"], [541, B, "1"]),
  row(11, [239, B, "Allergic to Mushrooms (No Sauce on Chicken)"]),
  footer("Screaming Eagle Dinner Club/#1234"),
]];

Deno.test("a last course printed in the body font stays in its plated item, not a category", () => {
  const cats = categories(streetDinner);
  expect(!cats.some((c) => c.name.startsWith("Pumpkin")), `dessert read as a category: ${cats.map((c) => c.name)}`);
  const plated = cats.flatMap((c) => c.items).find((i) => i.label === "Plated Food");
  expect(!!plated, "the Plated Food item is missing");
  expect(
    plated!.description.split("\n").includes("Pumpkin Pot de Creme") &&
      plated!.description.split("\n").includes("Maple Chantilly, Candied Pecans"),
    `dessert lines not in the plated item: ${JSON.stringify(plated!.description)}`,
  );
});

Deno.test("a heading-font line before a labelled row is still a category", () => {
  const cats = categories(streetDinner);
  expect(cats[0]?.name === "Street Dinner", `first category: ${cats[0]?.name}`);
  expect(cats[0].items.length === 2, `Street Dinner items: ${cats[0].items.length}`);
});

// Mid Mo Mahjong Classic Tourney, continuation page: no section header on the page, so
// the heading font must carry over from the page before, as qtyX does. "Italian Cannolis"
// was read as a category with the GF note joined onto its name.
const mahjong = [
  [
    row(99, [381, H, "Mid Mo Mahjong Classic Tourney"]),
    row(25, [42, H, "Event Headcount"], [558, B, "50"]),
    row(16, [42, H, "Event Date(s)"], [445, B, "10/05/2026 - 10/05/2026"]),
    row(16, [48, H, "Mon, 10/05/2026"], [247, H, "Lunch - 11:30am - Legacy Ballroom"], [536, H, "Qty"]),
    row(17, [289, H, "Displayed Lunch"]),
    row(17, [40, H, "Buffet"], [266, B, "Pasta Bar"], [538, B, "50"]),
    footer("Mid Mo Mahjong Classic Tourney/#77"),
  ],
  [
    row(99, [381, H, "Mid Mo Mahjong Classic Tourney"]),
    row(15, [500, H, "Legacy Ballroom"]),
    row(27, [471, B, "Club Contact: Rhi Winn"]),
    row(12, [364, B, "E: rhi@example.com P: (573) 000-0000"]),
    row(13, [289, H, "Themed Buffets"], [541, B, "1"]),
    row(16, [294, B, "Italian Cannolis"]),
    row(11, [137, N, "Please have GF noodles available - Rhi will follow up with guests that morning who will need those for"]),
    row(11, [311, N, "lunch."]),
    row(17, [40, H, "Beverages"], [255, B, "Buffet - Tea, Water, & Lemonade"], [538, B, "50"]),
    row(17, [289, H, "Bar Services"]),
    row(17, [40, H, "Services"], [255, B, "Cash Bar"], [538, B, "1"]),
    footer("Mid Mo Mahjong Classic Tourney/#77"),
  ],
];

Deno.test("on a continuation page a body-font line is not a category, a heading-font one is", () => {
  const cats = categories(mahjong);
  expect(!cats.some((c) => c.name.startsWith("Italian")), `dish read as a category: ${cats.map((c) => c.name)}`);
  const lines = cats.flatMap((c) => c.items).flatMap((i) => i.description.split("\n"));
  expect(lines.includes("Italian Cannolis"), "the cannolis line is lost");
  expect(cats.some((c) => c.name === "Bar Services"), `continuation heading lost: ${cats.map((c) => c.name)}`);
});

// Quick Lunch Bites: a two-line header whose second line is in the body font. Only the
// header's FIRST line has to be in the heading font; its wrapped remainder joins the name.
Deno.test("a header's wrapped second line in the body font still joins the header", () => {
  const cats = categories([[
    row(99, [381, H, "Board Lunch"]),
    row(16, [42, H, "Event Date(s)"], [445, B, "09/10/2026 - 09/10/2026"]),
    row(16, [48, H, "Thu, 09/10/2026"], [247, H, "Lunch - 12:00pm - Tack Room"], [536, H, "Qty"]),
    row(17, [280, H, "Quick Lunch Bites"]),
    row(12, [262, B, "Minimum order of 10 per item"]),
    row(17, [40, H, "A La Carte Ordering"], [266, B, "Chicken Salad Croissant"], [538, B, "10"]),
    footer("Board Lunch/#5"),
  ]]);
  expect(cats[0]?.name === "Quick Lunch Bites Minimum order of 10 per item", `header: ${cats[0]?.name}`);
});
