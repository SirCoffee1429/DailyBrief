const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Category names that indicate beverages — skip entire category when building the menu text
const BEVERAGE_KEYWORDS = [
  "beverage", "beverages", "bar", "drink", "drinks",
  "cocktail", "cocktails", "wine", "beer", "spirits",
  "alcohol", "juice", "coffee", "tea", "soda",
  "lemonade", "iced tea", "water", "sparkling water", "club soda", "tonic water",
  "bartending", "open bar", "consumption tab", "regular", "decaf", "sugars/sweeteners",
  "beverage cart", "na beverages", "standard beverage station", "mimosa bar",
];

function isBeverageCategory(name: string): boolean {
  const lower = name.toLowerCase();
  return BEVERAGE_KEYWORDS.some((kw) => lower.includes(kw));
}

interface BeoItem     { label?: string; description?: string; qty?: string }
interface BeoCategory { name?: string; items?: BeoItem[] }
interface BeoSection  { date?: string; time?: string; meal_type?: string; location?: string; categories?: BeoCategory[] }
interface DishBreakdown { source_dish: string; ingredients: string[] }

// Build a human-readable text block from BEO sections so Gemini can parse actual dish names
// from descriptions, rather than relying on generic item labels like "Buffet" or "Displayed"
function buildMenuText(sections: BeoSection[]): string {
  const lines: string[] = [];

  for (const section of sections) {
    const header = [section.meal_type, section.date, section.time, section.location]
      .filter(Boolean)
      .join(" | ");
    if (header) lines.push(`\n## ${header}`);

    for (const category of (section.categories || [])) {
      if (isBeverageCategory(category.name || "")) continue;
      if (category.name) lines.push(`  Category: ${category.name}`);

      for (const item of (category.items || [])) {
        const label = (item.label || "").trim();
        const desc  = (item.description || "").trim();
        if (label) lines.push(`    - ${label}`);
        if (desc)  lines.push(`      ${desc.split("\n").join("\n      ")}`);
      }
    }
  }

  return lines.join("\n").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sections } = await req.json() as { sections: BeoSection[] };

    if (!Array.isArray(sections) || sections.length === 0) {
      return new Response(
        JSON.stringify({ error: "No sections provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const menuText = buildMenuText(sections);

    if (!menuText) {
      return new Response(
        JSON.stringify({ items: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are a professional chef and kitchen purchasing manager for a country club.

Below is the raw menu content from a Banquet Event Order (BEO). Your job is to:
1. Identify every distinct food dish or menu item described in the text (ignore beverages, serving size notes like "Serves 20" or "20 pieces", and generic labels like "Displayed" or "A La Carte Ordering" unless they have a real dish described alongside them)
2. For each dish, list the core ingredients a commercial kitchen would need to ORDER or PURCHASE

Rules for ingredient lists:
- Focus on proteins, produce, dairy, specialty items, and notable components
- Omit ultra-basic pantry staples (water, generic salt, generic pepper) UNLESS they are a significant purchase item
- If an item is already a single purchasable ingredient (e.g. "Dinner Rolls", "Steamed Broccoli"), list it as-is with no further breakdown needed
- Use plain lowercase ingredient names (e.g. "russet potatoes", not "Russet Potatoes")
- Aim for 3–7 ingredients per dish; do not over-list

BEO Menu Content:
${menuText}

Return ONLY a valid JSON array where each element represents one dish. Format:
[
  { "source_dish": "Exact dish name as written in the BEO", "ingredients": ["ingredient1", "ingredient2"] }
]`;

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("Gemini API error:", JSON.stringify(geminiData));
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const raw: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "[]";

    // Strip markdown code fences if Gemini wraps the response anyway
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    let parsed: DishBreakdown[] = [];
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Raw Gemini output (unparseable):", raw);
      throw new Error("Gemini returned non-JSON output");
    }

    // Validate shape — keep only entries with a string source_dish and ingredients array
    const validated = parsed.filter(
      (d) =>
        d &&
        typeof d.source_dish === "string" &&
        Array.isArray(d.ingredients)
    );

    return new Response(JSON.stringify({ items: validated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-order-items error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
