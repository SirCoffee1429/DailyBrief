import "jsr:@supabase/functions-js@^2.4.1/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let files = [];

    if (body.files && Array.isArray(body.files)) {
      files = body.files;
    } else if (body.fileBase64) {
      files = [{
        fileBase64: body.fileBase64,
        mimeType: body.mimeType,
        fileName: body.fileName
      }];
    }

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "No files found in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting weekly BOH schedule parsing for ${files.length} file(s): ${files.map(f => f.fileName || 'Unnamed').join(', ')}...`);

    const prompt = `
You are an expert at parsing weekly Back of House (BOH) kitchen shift schedules for a country club.
The country club schedule week starts on MONDAY and ends on SUNDAY.

Analyze the uploaded file(s) (which could be one or multiple pages/documents of the same weekly schedule) and extract/merge the structured BOH weekly schedule.
You must return a single, unified JSON object with this exact schema:

{
  "week_start": "YYYY-MM-DD",  // The calendar date of the MONDAY that starts this schedule week. Even if the sheet says 'Week of May 17' (a Sunday), calculate and write the starting MONDAY's date (e.g. '2026-05-18').
  "shifts": [
    {
      "employee_name": "string", // Full name of the BOH crew member (e.g., 'Jane Smith')
      "role": "string",          // BOH role/position if mentioned (e.g., 'Prep Cook', 'Line Cook', 'Dishwasher', 'Sous Chef'). If not explicit, estimate from category headings or leave null.
      "date": "YYYY-MM-DD",      // The exact calendar date of this shift (calculated from the day-of-week it belongs to relative to the starting Monday).
      "start_time": "string",    // Start time of the shift (e.g. '8:00 AM', '4:00 PM', '10:00 AM'). If the day is a day-off or empty, do not add a shift object for that employee on that date!
      "end_time": "string",      // End time of the shift (e.g. '4:00 PM', '11:00 PM', 'Close'). If close is mentioned, write 'Close'.
      "note": "string",          // Shift-specific note (e.g., 'Closer', 'Delivery', 'AM Shift' or null if none)
      "color": "string"          // Highlight color for this employee or shift (values: 'green', 'blue', 'pink', 'yellow', or null)
    }
  ],
  "announcements": [
    "string" // List of general notes, prep lists, weekly specials, weekly meetings, or announcements found across all the sheet pages.
  ]
}

RULES:
1. MERGE PAGES: If multiple files/pages are provided, they represent different parts or pages of the exact same week's schedule. Merge all extracted shifts and announcements into a single schema. Avoid duplicating shifts if the same shift appears on multiple pages.
2. BOH ONLY: Only extract Back of House staff (Prep Cooks, Line Cooks, Dishwashers, Chefs). Ignore Front of House (Servers, Hosts, Bartenders, Managers) unless BOH staff are mixed together on the sheet.
3. DETECT HIGHLIGHTS & INFER COLOR CODING: Check the uploaded schedule sheets for color highlighting or markings on employees or shifts. Also infer from roles/sections and shift times. Always set the "color" field using the following rules:
   - Green Highlights OR roles containing "Dish" or "Dishwasher" or "Wash" -> "green"
   - Blue Highlights OR roles/shifts containing "Pool" or "Cabana" or "Pavilion" -> "blue"
   - Pink Highlights OR roles/shifts containing "Banquet" or "BEO" or "Event" -> "pink"
   - Yellow/Highlighter Yellow Highlights OR shift notes containing "AM" or shifts starting in the morning (e.g., start_time between 5:00 AM and 11:30 AM) -> "yellow"
   - If none of these match, set color to null.
4. CALCULATE DATES: Use the starting Monday date ("week_start") to compute the exact YYYY-MM-DD date for each day of the week:
   - Monday shifts: same date as "week_start"
   - Tuesday shifts: "week_start" + 1 day
   - Wednesday shifts: "week_start" + 2 days
   - Thursday shifts: "week_start" + 3 days
   - Friday shifts: "week_start" + 4 days
   - Saturday shifts: "week_start" + 5 days
   - Sunday shifts: "week_start" + 6 days
5. STRICT FORMATTING: Do NOT wrap the JSON in markdown code blocks or code fences. Return ONLY the raw JSON string.
`;

    // Map each file to the Gemini part format
    const geminiParts = [
      { text: prompt },
      ...files.map(file => ({
        inline_data: {
          mime_type: file.mimeType || "image/png",
          data: file.fileBase64
        }
      }))
    ];

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: geminiParts,
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error(`Gemini API error: ${errorText}`);
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log(`Raw Gemini response received. Length: ${rawOutput?.length || 0}`);

    if (!rawOutput) {
      throw new Error("Gemini returned empty text response");
    }

    // Try parsing to validate structure
    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (e) {
      console.error("Failed to parse Gemini output as JSON. Raw text:", rawOutput);
      throw new Error("Gemini output was not valid JSON");
    }

    console.log(`Successfully parsed schedule with week_start: ${parsed.week_start} and ${parsed.shifts?.length || 0} shifts`);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error in process-schedule function:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
