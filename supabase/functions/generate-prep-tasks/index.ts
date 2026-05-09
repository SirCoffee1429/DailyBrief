const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
// gemini-3.1-pro-preview used intentionally — better multi-step reasoning for complex prep task inference
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Same beverage keyword list as generate-order-items — skip entire category
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
interface PrepTask    { task: string; subtasks: string[] }

// Build human-readable menu text from BEO sections, filtering out beverages
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
    const { sections, event_name, meal_types } = await req.json() as {
      sections: BeoSection[];
      event_name?: string;
      meal_types?: string[];
    };

    if (!Array.isArray(sections) || sections.length === 0) {
      return new Response(
        JSON.stringify({ error: "No sections provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const menuText = buildMenuText(sections);

    if (!menuText) {
      return new Response(
        JSON.stringify({ tasks: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventContext  = event_name || "banquet event";
    const mealContext   = (meal_types || []).filter(Boolean).join(", ") || "banquet";

    const prompt = `You are an experienced banquet prep chef creating a kitchen prep list for "${eventContext}" (${mealContext}).

For each food item on the menu, identify the physical kitchen prep tasks required — chopping, dicing, slicing, traying, making sauces, marinating, etc. Break each dish into its logical prep steps as subtasks.

EXAMPLES (use these as your reference for format and detail level):
- "Veal Meatballs — House made veal meatball with mushroom ragu and marinara"
  → task: "Veal Meatballs", subtasks: ["Make Veal Meatballs", "Mushroom Ragu", "Marinara"]
- "Smoked Brisket"
  → task: "Smoked Brisket", subtasks: ["Make Brine for Brisket", "Brine Brisket", "Rub Brisket with Seasoning Mixture"]
- "Omelet Station"
  → task: "Omelet Station", subtasks: ["Dice Onions", "Dice Peppers", "Slice Mushrooms", "Dice Ham", "Chop Bacon", "Sausage", "Cheese", "Dice Tomato", "Jalapeños"]
- "Bacon and Sausage"
  → task: "Bacon and Sausage", subtasks: ["Tray Bacon", "Tray Sausage"]
- "Fruit Salad"
  → task: "Fruit Salad", subtasks: ["Chop Pineapple", "Chop Honeydew", "Chop Cantaloupe", "Grapes", "Slice Strawberries"]
- "House Salad"
  → task: "House Salad", subtasks: ["Slice Tomatoes", "Shred Carrots", "Slice Cucumbers", "Slice Red Onion"]
- "Dinner Rolls"
  → task: "Dinner Rolls", subtasks: []

RULES:
- Each food item becomes exactly one task entry with zero or more subtasks
- Subtasks are specific physical prep actions (chop, dice, tray, slice, make, cook, brine, etc.)
- Items requiring zero kitchen prep (pre-packaged, already-made) get an empty subtasks array
- One subtask per distinct prep action — do not combine unrelated steps into one
- Use plain, short kitchen-style phrasing — no descriptions, no quantities, no long sentences
- Station components needing no prep (e.g. a bag of "Cheese", packaged "Sausage") are listed as-is in subtasks
- Do NOT include any beverage, bar, or drink items

MENU:
${menuText}

Return ONLY valid JSON in this exact shape — no markdown, no explanation:
{
  "tasks": [
    { "task": "string", "subtasks": ["string", "string"] }
  ]
}`;

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
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "{}"; // "{}" not "[]" — expected shape is { tasks: [] }

    // Strip markdown fences if Gemini includes them despite responseMimeType
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    let parsed: { tasks?: PrepTask[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Raw Gemini output (unparseable):", raw);
      throw new Error("Gemini returned non-JSON output");
    }

    // Keep only entries with a string task name and a subtasks array
    const validated: PrepTask[] = (parsed.tasks || []).filter(
      (t) => t && typeof t.task === "string" && Array.isArray(t.subtasks)
    );

    return new Response(JSON.stringify({ tasks: validated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-prep-tasks error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
