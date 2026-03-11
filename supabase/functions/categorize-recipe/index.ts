/// <reference path="../deno-types.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_CATEGORIES = [
  "Salad",
  "Fry",
  "Sauces",
  "BBQ",
  "Grill",
  "Sautee",
  "Add-Ons",
  "Uncategorized"
];

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, categories } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'text' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default to the old categories if none provided, for backward compatibility
    const allowedCategories = Array.isArray(categories) && categories.length > 0
      ? categories
      : ALLOWED_CATEGORIES;

    const systemPrompt = `You are an expert culinary categorization assistant. 
You will be given raw text extracted from a restaurant recipe workbook (Excel file). 
Your ONLY job is to determine which of the following categories this recipe belongs to:
${allowedCategories.join(", ")}

Respond with EXACTLY ONE word/phrase from the list above. Do not include any other text, punctuation, or explanation.
If you cannot determine the category, respond with "Uncategorized".

RECIPE TEXT TO CATEGORIZE:
${text.substring(0, 1500)} // Analyze up to first 1500 chars to avoid token limits
`;

    // Call Gemini
    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1, // Low temp for more deterministic output
          maxOutputTokens: 1000,
        },
      }),
    });

    const geminiData = await geminiRes.json();
    console.log("Gemini API Response:", JSON.stringify(geminiData));

    if (!geminiRes.ok) {
      console.error("Gemini API Error:", geminiData);
      return new Response(JSON.stringify({ category: "Uncategorized", error: "Gemini API Error", details: geminiData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rawCategory = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Uncategorized";

    // Clean up response just in case the AI adds punctuation
    let category = rawCategory.replace(/[^a-zA-Z- ]/g, ""); // Allow spaces in categories now
    category = category.trim();

    // Validate that it returned one of our allowed categories
    const matchedCategory = allowedCategories.find((c: string) => c.toLowerCase() === category.toLowerCase());
    const finalCategory = matchedCategory || "Uncategorized";

    console.log(`Raw: "${rawCategory}", Cleaned: "${category}", Final: "${finalCategory}"`);

    return new Response(JSON.stringify({ category: finalCategory }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
