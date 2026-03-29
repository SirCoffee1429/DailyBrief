import "jsr:@supabase/functions-js@^2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (req) => {
  try {
    // 1. Get the payload from Postmark
    const payload = await req.json();
    console.log("Received Postmark payload from:", payload.From);

    const attachment = payload.Attachments?.find((a: { ContentType: string; Name: string; Content: string }) =>
      a.ContentType === "application/pdf" || a.Name.toLowerCase().endsWith(".pdf")
    );

    if (!attachment) {
      console.log("No PDF attachment found in payload");
      return new Response(JSON.stringify({ message: "No PDF found" }), { status: 200 });
    }

    // 2. Extract PDF content (Base64)
    const pdfBase64 = attachment.Content;
    console.log(`Found PDF: ${attachment.Name}, size: ${attachment.Content.length} chars base64`);

    // 3. Ask Gemini to parse the PDF
    const prompt = `
      You are an expert at parsing restaurant sales reports.
      Attached is a PDF of an "Item Sales Report".

      Return ONLY a JSON object with exactly two keys:
      1. "report_date": The date of this report in YYYY-MM-DD format.
         Look in the header, title, footer, or anywhere on the page for a date (e.g. "03/27/2026", "March 27, 2026", "2026-03-27").
         If you cannot find any date, use null.
      2. "items": An array of objects, each with these keys:
         - "item_name" (string): the name of the item
         - "units_sold" (number): the number of units sold
         - "category" (string): the category (e.g., Appetizers, BBQ, Desserts)

      Rules for items:
      - Ignore "Item Category Totals" and "Totals" lines
      - Ignore items with 0 units sold
      - Sort items by units_sold descending

      Example response shape:
      { "report_date": "2026-03-27", "items": [{"item_name": "Brisket", "units_sold": 42, "category": "BBQ"}] }
    `;

    console.log("Sending PDF to Gemini for parsing...");
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
      console.error("Gemini API Error:", errorText);
      throw new Error(`Gemini API Error: ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedData = JSON.parse(rawOutput);

    // Extract date from Gemini response, fall back to today (UTC) if not found
    const reportDate: string = parsedData.report_date
      || new Date().toISOString().split("T")[0];
    const items: { item_name: string; units_sold: number; category: string }[] = parsedData.items || [];

    console.log(`Gemini parsed ${items.length} items from the PDF, report date: ${reportDate}`);

    if (items.length === 0) {
      console.warn("Gemini returned 0 items — check PDF or prompt");
    }

    // 4. Save to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase
      .from("sales_data")
      .insert(
        items.map((item) => ({
          report_date: reportDate,
          item_name: item.item_name,
          units_sold: item.units_sold,
          category: item.category,
          metadata: { source: payload.From },
        }))
      );

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    console.log(`Successfully saved ${items.length} items to sales_data for ${reportDate}`);

    return new Response(JSON.stringify({ success: true, count: items.length, report_date: reportDate }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    console.error("Error processing sales data:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
