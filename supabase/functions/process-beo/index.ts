import "jsr:@supabase/functions-js@^2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface BeoEvent {
  event_name: string | null;
  event_date: string | null;
  event_end_date?: string | null;
  start_time?: string | null;
  guest_count?: number;
  location?: string | null;
  timeline?: object[];
  sections?: object[];
  notes_text?: string | null;
}

interface ConflictRecord {
  existing: { id: string; event_name: string; event_date: string };
  incoming: { event_name: string; event_date: string };
}

// Build the legacy food_items array from structured sections data
function buildFoodItems(event: BeoEvent): { item: string; quantity: string | number }[] {
  const foodItems: { item: string; quantity: string | number }[] = [];
  for (const section of ((event.sections as any[]) || [])) {
    for (const cat of (section.categories || [])) {
      for (const it of (cat.items || [])) {
        foodItems.push({
          item: `${it.label ? it.label + ': ' : ''}${(it.description || '').split('\n')[0]}`.slice(0, 200),
          quantity: it.qty || '',
        });
      }
    }
  }
  return foodItems;
}

// Check which parsed events conflict with existing banquet_event_orders rows
async function findConflicts(
  db: ReturnType<typeof createClient>,
  parsedEvents: BeoEvent[]
): Promise<ConflictRecord[]> {
  const conflicts: ConflictRecord[] = [];

  for (const event of parsedEvents) {
    if (!event.event_name || !event.event_date) continue;

    const { data: existing } = await db
      .from("banquet_event_orders")
      .select("id, event_name, event_date")
      .eq("event_name", event.event_name)
      .eq("event_date", event.event_date)
      .maybeSingle();

    if (existing) {
      conflicts.push({
        existing: { id: existing.id, event_name: existing.event_name, event_date: existing.event_date },
        incoming: { event_name: event.event_name, event_date: event.event_date },
      });
    }
  }

  return conflicts;
}

// Build the parsed-field payload shared by insert and update
function buildEventPayload(event: BeoEvent): object {
  return {
    event_name: event.event_name || "Unknown Event",
    event_date: event.event_date || new Date().toISOString().split("T")[0],
    event_end_date: event.event_end_date || null,
    start_time: event.start_time || "",
    guest_count: event.guest_count || 0,
    location: event.location || null,
    timeline: event.timeline || [],
    sections: event.sections || [],
    notes_text: event.notes_text || null,
    food_items: buildFoodItems(event),
  };
}

// Update an existing BEO row with fresh PDF data, preserving crew_notes and completed
async function updateEvent(
  db: ReturnType<typeof createClient>,
  existingId: string,
  event: BeoEvent
): Promise<void> {
  const { error } = await db
    .from("banquet_event_orders")
    .update(buildEventPayload(event))
    .eq("id", existingId);

  if (error) {
    console.error(`Error updating event id "${existingId}":`, error);
    throw error;
  }
}

// Insert a new BEO row and return its ID
async function insertEvent(
  db: ReturnType<typeof createClient>,
  event: BeoEvent
): Promise<string> {
  const eventName = event.event_name || null;
  const eventDate = event.event_date || null;

  if (!eventName || !eventDate) {
    console.warn(`Warning: event missing required fields — name: ${eventName}, date: ${eventDate}`);
  }

  const { data: record, error } = await db
    .from("banquet_event_orders")
    .insert(buildEventPayload(event))
    .select("id")
    .single();

  if (error) {
    console.error(`Error inserting event "${eventName}":`, error);
    throw error;
  }

  return record.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- Mode B: pre-parsed events with overwrite confirmed ---
    // Updates existing rows in place so event_tasks, event_order_items, and crew_notes are preserved.
    if (payload.parsedEvents && payload.overwrite === true) {
      const parsedEvents: BeoEvent[] = payload.parsedEvents;

      // Re-check conflicts to get current IDs (row may have changed while dialog was open)
      const conflicts = await findConflicts(db, parsedEvents);
      const conflictMap = new Map(conflicts.map((c) => [
        `${c.existing.event_name}||${c.existing.event_date}`,
        c.existing.id,
      ]));

      let updatedCount = 0;
      let insertedCount = 0;

      for (const event of parsedEvents) {
        const key = `${event.event_name}||${event.event_date}`;
        const existingId = conflictMap.get(key);

        if (existingId) {
          await updateEvent(db, existingId, event);
          updatedCount++;
        } else {
          await insertEvent(db, event);
          insertedCount++;
        }
      }

      console.log(`Updated ${updatedCount} BEO(s), inserted ${insertedCount} new BEO(s)`);

      return new Response(
        JSON.stringify({ success: true, updated: updatedCount, inserted: insertedCount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Mode A: PDF upload — parse via Gemini then check conflicts ---
    let pdfBase64 = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      pdfBase64 = payload.pdfBase64 || "";
    } else {
      // formData path (legacy support)
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        pdfBase64 = btoa(binary);
      }
    }

    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "No PDF content found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting BEO parsing via Gemini...`);

    const prompt = `
You are an expert at parsing Banquet Event Orders (BEOs) for a country club.
This PDF may contain ONE or MULTIPLE BEOs. Each new BEO begins on its own page with the club logo and a new event title in the top-right.

EXTRACT every event in the PDF. For EACH event, return an object with these EXACT keys:

{
  "event_name": string,                       // event title (e.g. "Spring Scramble")
  "event_date": "YYYY-MM-DD",                 // first/start day of event
  "event_end_date": "YYYY-MM-DD" | null,      // last day if multi-day, else null
  "start_time": string | null,                // earliest meal/activity time (e.g. "7:00am")
  "guest_count": integer,                     // from "Event Headcount" row
  "location": string | null,                  // from "Event Location(s)" row (full text)
  "timeline": [                               // from the "Start Date / Start Time / Timeline Item / Description" table at the top of the BEO. May be empty.
    { "date": "YYYY-MM-DD", "time": "7:00am", "item": "Range Opens", "description": "" }
  ],
  "sections": [                               // every meal/activity block. Each block starts with a header row like "Sat, 04/25/2026 | Breakfast - 7:00am - Hitching Post | Qty"
    {
      "date": "YYYY-MM-DD",
      "day_label": "Sat, 04/25/2026",         // exact label from the PDF
      "meal_type": "Breakfast",               // Breakfast / Lunch / Dinner / Cocktail / Golf / Drop-Off Order / Kid's Activity / Awards / etc.
      "time": "7:00am",
      "location": "Hitching Post",
      "categories": [                          // sub-tables inside the section. Each has a centered header like "Member Event - Buffets", "Non-Alcoholic Beverages", "Bar Services", etc.
        {
          "name": "Member Event - Buffets",
          "items": [
            {
              "label": "Custom Buffets",      // left-column label (e.g. "Custom Buffets", "Beverages", "Services", "Entrée 1")
              "description": "Ham, Egg, & Cheese English Muffin Breakfast Sandwiches\\nGrad & Go at The Turn",  // full center-column text, preserve line breaks with \\n
              "qty": "73"                     // right-column qty as string. "" if blank.
            }
          ]
        }
      ]
    }
  ],
  "notes_text": string | null                  // full text from any "Notes" block(s) at the end of the BEO. Preserve line breaks with \\n. Concatenate multiple Notes blocks with two newlines.
}

DO NOT extract these (ignore entirely):
- Page header / footer (page number, "Printed:" timestamp)
- Club logo / club address line ("6221 E. Broadway, Columbia...")
- "Club Contact:" line and the contact email/phone below it
- "Primary Contact" table (name, address, email, phone, member #)
- "Additional Contacts" table (role, billing contact, member #)

RULES:
- ALWAYS return a JSON ARRAY of event objects, even if there is only one event.
- Use null for missing strings, 0 for missing guest_count, [] for missing arrays.
- Parse dates strictly to YYYY-MM-DD. Convert "04/25/2026" → "2026-04-25".
- Preserve original capitalization and punctuation in descriptions.
- Do NOT wrap in markdown code fences. Return ONLY the JSON array.
`;

    // Setup timeout AbortController to protect against Deno gateway timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn("Gemini API call timed out after 130 seconds. Aborting request.");
      controller.abort();
    }, 130000);

    let geminiRes;
    try {
      geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        console.error("Gemini API call aborted due to 130s timeout.");
        throw new Error("Gemini API request timed out after 130 seconds. Please try uploading a smaller PDF or verify network stability.");
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error(`Gemini API error: ${errorText}`);
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log(`Raw Gemini output length: ${rawOutput?.length}`);

    if (!rawOutput) {
      throw new Error("Gemini returned empty output");
    }

    let parsedEvents: BeoEvent[] = JSON.parse(rawOutput);
    if (!Array.isArray(parsedEvents)) parsedEvents = [parsedEvents];

    console.log(`Parsed ${parsedEvents.length} event(s) from BEO PDF`);

    // --- Mode C: parse only, write nothing ---
    // Used by receive-beo-email, which queues the result in pending_beo_imports
    // for office review instead of touching banquet_event_orders. Returns the
    // same shape Mode B accepts as `parsedEvents`, so approving a queued import
    // is a replay rather than a second Gemini call.
    if (payload.parseOnly === true) {
      return new Response(
        JSON.stringify({ parsedEvents }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for conflicts before inserting
    const conflicts = await findConflicts(db, parsedEvents);

    if (conflicts.length > 0) {
      console.log(`Found ${conflicts.length} conflict(s) — returning for confirmation`);
      return new Response(
        JSON.stringify({ needsConfirmation: true, conflicts, parsedEvents }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No conflicts — insert directly
    const insertedIds: string[] = [];
    for (const event of parsedEvents) {
      insertedIds.push(await insertEvent(db, event));
    }

    console.log(`Successfully inserted ${insertedIds.length} BEO(s)`);

    return new Response(
      JSON.stringify({ success: true, count: insertedIds.length, ids: insertedIds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error processing BEO:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
