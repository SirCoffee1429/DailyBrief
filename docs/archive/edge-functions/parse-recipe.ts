// ARCHIVED — deployed source of the `parse-recipe` edge function (v5, verify_jwt = true),
// copied from production on 2026-09-27 before deleting it. Kept here because it was never
// committed anywhere else; this is the only copy.
//
// History: the workbook upload called it via supabase.functions.invoke('parse-recipe') in
// b6f25b0 (2026-03-16) and the call was removed in the very next commit, d191190, the same
// day. Nothing has called it since. It parses ANY recipe document (text, image or PDF)
// into { recipes: [{ name, yield, ingredients[], instructions[], ... }] } — possibly useful
// seed material for the "universal ingestion" future plan, which is why it was kept.
//
// Not deployable from here on purpose: it lives outside supabase/functions/.
// ------------------------------------------------------------------------------------------

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, mimeType, base64Data } = await req.json();

    if (!text && !base64Data) {
      return new Response(
        JSON.stringify({ error: "Missing 'text' or 'base64Data' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert culinary recipe parser. You will be given raw content from a recipe document (could be from any restaurant, country club, or food business — any format, any layout).

Your job is to extract ALL recipes from the content and return them as structured JSON.

Return ONLY valid JSON (no markdown, no explanation) with this EXACT structure:
{
  "recipes": [
    {
      "name": "recipe name",
      "yield": number or null,
      "yield_unit": "portions" or "servings" or relevant unit,
      "ingredients": [
        {"name": "ingredient name", "quantity": number or null, "unit": "unit or empty string"}
      ],
      "instructions": ["step 1", "step 2"],
      "prep_time": "time string or null",
      "cook_time": "time string or null",
      "confidence": 0.0 to 1.0
    }
  ]
}

Rules:
- If the document contains multiple recipes, return ALL of them in the array.
- If the document has only one recipe, return an array with one item.
- The "confidence" field should reflect how confident you are in the parsing accuracy (1.0 = perfect, 0.5 = guessing).
- For ingredients, always try to separate quantity, unit, and name. If quantity is unclear, set it to null.
- Normalize common unit abbreviations: "oz" for ounces, "lb" for pounds, "cup" for cups, "tbsp" for tablespoon, "tsp" for teaspoon, "g" for grams, "kg" for kilograms, "ml" for milliliters, "L" for liters, "each" for count items.
- If instructions are not provided, return an empty array for instructions.
- If the content looks like a spreadsheet/table, each row or section that represents a distinct recipe should be a separate item.
- Return ONLY the JSON object, nothing else.`;

    // Build the request parts
    const parts: Array<{text?: string; inline_data?: {mime_type: string; data: string}}> = [];

    // If we have base64 data (image or PDF), include it as inline data
    if (base64Data && mimeType) {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
      parts.push({ text: systemPrompt + (text ? `\n\nAdditional text context:\n${text}` : '') });
    } else {
      parts.push({ text: `${systemPrompt}\n\nRECIPE CONTENT TO PARSE:\n${text}` });
    }

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: parts,
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8000,
          responseMimeType: "application/json",
        },
      }),
    });

    const geminiData = await geminiRes.json();
    console.log("Gemini parse-recipe response status:", geminiRes.status);

    if (!geminiRes.ok) {
      console.error("Gemini API Error:", JSON.stringify(geminiData));
      return new Response(
        JSON.stringify({ error: "Gemini API Error", details: geminiData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON output:", rawText);
      // Try to extract JSON from the response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return new Response(
            JSON.stringify({ error: "Failed to parse AI response", raw: rawText.substring(0, 500) }),
            { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response", raw: rawText.substring(0, 500) }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Ensure the response has the expected structure
    if (!parsed.recipes) {
      // If the AI returned a single recipe object instead of wrapped in recipes array
      if (parsed.name || parsed.ingredients) {
        parsed = { recipes: [parsed] };
      } else {
        parsed = { recipes: [] };
      }
    }

    // Validate and clean each recipe
    parsed.recipes = parsed.recipes.map((recipe: any) => ({
      name: recipe.name || "Untitled Recipe",
      yield: recipe.yield || null,
      yield_unit: recipe.yield_unit || "portions",
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ing: any) => ({
        name: ing.name || "Unknown ingredient",
        quantity: ing.quantity ?? null,
        unit: ing.unit || ""
      })) : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      prep_time: recipe.prep_time || null,
      cook_time: recipe.cook_time || null,
      confidence: typeof recipe.confidence === 'number' ? recipe.confidence : 0.5
    }));

    console.log(`Parsed ${parsed.recipes.length} recipe(s)`);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-recipe error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
