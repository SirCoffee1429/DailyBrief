const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Category names that indicate beverages — skip these when building the ingredient list
const BEVERAGE_KEYWORDS = [
  "beverage", "beverages", "bar", "drink", "drinks",
  "cocktail", "cocktails", "wine", "beer", "spirits",
  "alcohol", "juice", "coffee", "tea", "soda",
  "lemonade", "iced tea", "water", "sparkling water", "club soda", "tonic water", "Bartending", "Open Bar", "Consumption Tab", "Regular", "Decaf", "Sugars/Sweeteners",
  "Beverage Cart", "NA Beverages", "Standard Beverage Station", "Mimosa Bar", 
];

function isBeverageCategory(name: string): boolean {
  const lower = name.toLowerCase();
  return BEVERAGE_KEYWORDS.some((kw) => lower.includes(kw));
}

interface BeoItem  { label?: string; description?: string; qty?: string }
interface BeoCategory { name?: string; items?: BeoItem[] }
interface BeoSection  { categories?: BeoCategory[] }
interface DishBreakdown { source_dish: string; ingredients: string[] }

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

    // Collect unique food item labels, skipping beverage categories
    const seen = new Set<string>();
    const foodItems: string[] = [];

    for (const section of sections) {
      for (const category of (section.categories || [])) {
        if (isBeverageCategory(category.name || "")) continue;
        for (const item of (category.items || [])) {
          const label = (item.label || "").trim();
          if (label && !seen.has(label.toLowerCase())) {
            seen.add(label.toLowerCase());
            foodItems.push(label);
          }
        }
      }
    }

    if (foodItems.length === 0) {
      return new Response(
        JSON.stringify({ items: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are a professional chef and kitchen purchasing manager for a country club.
For each menu item listed below, break it down into the core ingredients a commercial kitchen would need to ORDER or PURCHASE.

Rules:
- Focus on proteins, produce, dairy, specialty items, and notable components
- Omit ultra-basic pantry staples (water, generic salt, generic pepper) UNLESS they are a significant purchase item for this dish
- If an item is already a single purchasable ingredient (e.g. "Dinner Rolls", "Steamed Broccoli"), list it as-is
- Use plain lowercase ingredient names (e.g. "russet potatoes", not "Russet Potatoes")
- Aim for 3–7 ingredients per dish; do not over-list

Menu Items:
${foodItems.map((item) => `- ${item}`).join("\n")}

Return ONLY a valid JSON array. No markdown, no code fences, no explanation. Format:
[
  { "source_dish": "Exact Menu Item Name", "ingredients": ["ingredient1", "ingredient2"] }
]`;

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
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
      console.error("Failed to parse Gemini response as JSON:", cleaned);
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
