import "jsr:@supabase/functions-js@^2.4.1/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const PROMPT = `
You are parsing a weekly specials menu for a country club restaurant.

The document has two sections:
- A lunch section (may be labeled "LUNCH", "LUNCH / HAPPY HOUR", or similar)
- A dinner section (may be labeled "DINNER FEATURES", "DINNER", or similar)

Within each section, each entry starts with a day name in ALL CAPS (MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY), immediately followed by the item name and price, then a description on the next line. The day name may be directly concatenated with the item text with no space between them.

Rules:
- If an entry applies to multiple days (e.g. "FRIDAY & SATURDAY"), create a SEPARATE entry for EACH day with the same content.
- If a single day has multiple items (e.g. two dinner options), combine them into one content string separated by a blank line.
- The content field should be: first line is the item name and price, next line is the description.

Day number mapping (use these exact integers):
  Monday = 0, Tuesday = 1, Wednesday = 2, Thursday = 3,
  Friday = 4, Saturday = 5, Sunday = 6

Return ONLY a valid JSON array. No markdown, no explanation. Each object must have exactly these keys:
[
  {
    "day_of_week": <integer 0-6>,
    "meal": <"lunch" or "dinner">,
    "content": "<item name and price>\\n<description>"
  }
]
`.trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { rawText, fileBase64, mimeType } = payload as {
      rawText?: string;
      fileBase64?: string;
      mimeType?: string;
    };

    if (!rawText && !fileBase64) {
      return new Response(
        JSON.stringify({ error: "No content provided. Send rawText or fileBase64." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parts: unknown[];

    if (rawText) {
      // Pasted plain text — send directly
      parts = [{ text: `${PROMPT}\n\nDOCUMENT TEXT:\n${rawText}` }];
    } else {
      // File (docx or pdf) — send as inline data; Gemini 3 Flash supports both
      const resolvedMimeType =
        mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      parts = [
        { text: PROMPT },
        { inlineData: { mimeType: resolvedMimeType, data: fileBase64 } },
      ];
    }

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return new Response(
        JSON.stringify({ error: "Gemini API error", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Gemini raw output:", raw.slice(0, 500));

    let entries: unknown[];
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      entries = JSON.parse(cleaned);
      if (!Array.isArray(entries)) throw new Error("Response is not an array");
    } catch (parseErr) {
      console.error("Parse error:", parseErr, "Raw:", raw);
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini response", raw }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize entries
    const valid = (entries as Record<string, unknown>[]).filter(
      (e) =>
        typeof e.day_of_week === "number" &&
        e.day_of_week >= 0 &&
        e.day_of_week <= 6 &&
        (e.meal === "lunch" || e.meal === "dinner") &&
        typeof e.content === "string" &&
        e.content.trim().length > 0
    );

    return new Response(
      JSON.stringify({ success: true, entries: valid, total: valid.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
