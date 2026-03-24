import "jsr:@supabase/functions-js@^2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get the payload (expecting { pdfBase64: string } or multipart/form-data)
    let pdfBase64 = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        const payload = await req.json();
        pdfBase64 = payload.pdfBase64;
    } else {
        // Handle multipart fallback if needed
        const formData = await req.formData();
        const file = formData.get("file") as File;
        if (file) {
           const arrayBuffer = await file.arrayBuffer();
           pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        }
    }

    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "No PDF content found" }), { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Starting BEO parsing via Gemini 3 Flash...`);

    // 2. Ask Gemini to parse the PDF for BEO details
    const prompt = `
      You are an expert at parsing Banquet Event Orders (BEO). 
      Please carefully extract the following information from the attached ReserveCloud/EventPro BEO PDF.
      
      Look closely for the main event details:
      - Event Name
      - Event Date (in YYYY-MM-DD format)
      - Start Time
      - Guest Count (integer)
      
      CRITICAL: You must extract ALL food items, catering dishes, and beverages listed on the BEO, along with their respective quantities (e.g., 50 units, 2 gallons, 3 dozen, etc). Look for tabular layouts or menus often found in the middle or end of the document. Ignore pricing, notes, and staff instructions.
      
      Return ONLY a JSON object with these exact keys: 
      "event_name" (the title of the event),
      "event_date" (YYYY-MM-DD),
      "start_time" (e.g. "5:00 PM"),
      "guest_count" (integer),
      "food_items" (an array of objects with exactly two keys: "item" (string describing the food/beverage) and "quantity" (string or number indicating amount))
    `;

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: pdfBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedData = JSON.parse(rawOutput);
    console.log(`Gemini parsed BEO: ${parsedData.event_name} for ${parsedData.event_date}`);

    // 3. Save to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: record, error } = await supabase
      .from("banquet_event_orders")
      .insert({
          event_name: parsedData.event_name || "Unknown Event",
          event_date: parsedData.event_date || new Date().toISOString().split("T")[0],
          start_time: parsedData.start_time || "",
          guest_count: parsedData.guest_count || 0,
          food_items: parsedData.food_items || [],
      })
      .select('id')
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, id: record.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error processing BEO:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
