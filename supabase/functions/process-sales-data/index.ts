import "jsr:@supabase/functions-js@^2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";


Deno.serve(async (req) => {
  try {
    // 1. Get the payload from Postmark
    // Postmark sends a JSON payload. We need the 'Attachments' array.
    const payload = await req.json();
    console.log("Received Postmark payload");

    const attachment = payload.Attachments?.find((a: { ContentType: string, Name: string, Content: string }) =>
      a.ContentType === "application/pdf" || a.Name.toLowerCase().endsWith(".pdf")
    );

    if (!attachment) {
      console.log("No PDF attachment found");
      return new Response(JSON.stringify({ message: "No PDF found" }), { status: 200 });
    }

    // 2. Extract PDF content (Base64)
    const pdfBase64 = attachment.Content;

    // Define the background task
    const processPdfInBackground = async () => {
      try {
        console.log("Starting background processing of PDF...");
        // 3. Ask Gemini to parse the PDF
        const prompt = `
          You are an expert at parsing restaurant sales reports. 
          Attached is a PDF of an "Item Sales Report". 
          Please extract all items sold. 
          Return ONLY a JSON array of objects with these keys: 
          "item_name" (the name of the item), 
          "units_sold" (the number of units sold as a number), 
          "category" (the category it falls under, e.g., Appetizers, BBQ, Desserts).
          
          The report contains a list of items and their "Units Sold". 
          Ignore "Item Category Totals" and "Totals" lines.
          Ignore items with 0 units sold if any.
          Sort the resulting array by units_sold descending.
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

        // 4. Save to Supabase
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Determine report date (usually today since it's emailed at 5am)
        // Actually, it's the previous night's sales, so let's use yesterday's date if possible,
        // or parse it from the filename/PDF if Gemini can.
        // For now, let's use the current date as the "report" timestamp.
        const reportDate = new Date().toISOString().split('T')[0];

        const { error } = await supabase
          .from('sales_data')
          .insert(
            parsedData.map((item: { item_name: string, units_sold: number, category: string }) => ({
              report_date: reportDate,
              item_name: item.item_name,
              units_sold: item.units_sold,
              category: item.category,
              metadata: { source: payload.From }
            }))
          );

        if (error) throw error;

        console.log(`Successfully saved ${parsedData.length} items to sales_data in background task`);
      } catch (bgError) {
        console.error("Error in background task processing PDF:", bgError);
      }
    };

    // Tell the Edge Runtime to keep the worker alive until the promise settles
    EdgeRuntime.waitUntil(processPdfInBackground());

    console.log("Accepted payload, responding immediately to prevent timeout");
    return new Response(JSON.stringify({ success: true, message: "PDF processing started in background" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    console.error("Error processing request payload:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
