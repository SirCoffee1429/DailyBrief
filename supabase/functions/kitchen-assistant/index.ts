import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Mirrors the sales_data columns the assistant reads. total_net_sales is the
// gross amount for the line, net_sales is the amount after discounts. There is
// no total_revenue column — that name was retired on 2026-04-11 when the sales
// trend chart introduced the current financial columns.
interface SalesDataRow {
  report_date: string;
  category: string;
  item_name: string;
  units_sold: number;
  unit_price: number;
  total_net_sales: number;
  net_sales: number;
}

// ─── Sales intent detection ───────────────────────────────────────────────────
const SALES_KEYWORDS = [
  "sold", "sell", "sales", "revenue", "popular", "top seller", "best seller",
  "worst seller", "most sold", "least sold",
  "top item", "best item", "this week", "last week", "yesterday",
  "this month", "last month", "how much did", "how much have",
  "did we sell", "have we sold", "what sold", "ranking", "breakdown",
];

function isSalesQuestion(q: string): boolean {
  const lower = q.toLowerCase();
  return SALES_KEYWORDS.some((kw) => lower.includes(kw));
}

// PostgREST caps every response at 1000 rows. A month-wide query silently came
// back with only its 13 most recent days out of 25, and the totals built from
// that slice were then reported as the whole month. Page until the well runs
// dry so the summary describes the range that was actually asked for.
const PAGE_SIZE = 1000;

// Roughly two weeks of line items. Past this the raw rows are dropped and the
// model works from the exact totals alone.
const RAW_ROW_LIMIT = 1200;

async function fetchAllSales(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<{ rows: SalesDataRow[]; error: unknown }> {
  const all: SalesDataRow[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sales_data")
      .select("report_date, category, item_name, units_sold, unit_price, total_net_sales, net_sales")
      .gte("report_date", startDate)
      .lte("report_date", endDate)
      .order("report_date", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) return { rows: [], error };

    const page = (data || []) as SalesDataRow[];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return { rows: all, error: null };
}

// Do the adding here instead of leaving it to the model. Asked to total a
// hundred CSV rows a day by hand, Gemini returned figures that were close but
// consistently wrong (a week came back 1,718.00 light), and a plausible wrong
// dollar figure is worse than an error because nobody can tell it is wrong.
// Units it summed correctly, but money is the number people act on.
function summariseSales(rows: SalesDataRow[]): string {
  const money = (n: number) => n.toFixed(2);
  const byDay = new Map<string, { units: number; gross: number; net: number }>();
  const byItem = new Map<string, { units: number; gross: number }>();
  const byCategory = new Map<string, { units: number; gross: number }>();
  let grandUnits = 0;
  let grandGross = 0;
  let grandNet = 0;

  for (const r of rows) {
    const units = Number(r.units_sold) || 0;
    const gross = Number(r.total_net_sales) || 0;
    const net = Number(r.net_sales) || 0;

    const day = byDay.get(r.report_date) || { units: 0, gross: 0, net: 0 };
    day.units += units;
    day.gross += gross;
    day.net += net;
    byDay.set(r.report_date, day);

    const item = byItem.get(r.item_name) || { units: 0, gross: 0 };
    item.units += units;
    item.gross += gross;
    byItem.set(r.item_name, item);

    const cat = byCategory.get(r.category) || { units: 0, gross: 0 };
    cat.units += units;
    cat.gross += gross;
    byCategory.set(r.category, cat);

    grandUnits += units;
    grandGross += gross;
    grandNet += net;
  }

  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const items = [...byItem.entries()].sort((a, b) => b[1].units - a[1].units);
  const cats = [...byCategory.entries()].sort((a, b) => b[1].units - a[1].units);

  let out = "=== PRECOMPUTED EXACT TOTALS (authoritative — use these verbatim, do NOT re-add the raw rows) ===\n";
  out += `GRAND TOTAL: ${grandUnits} units, ${money(grandGross)} total_net_sales, ${money(grandNet)} net_sales, across ${days.length} days with data\n\n`;

  out += "TOTALS BY DAY (report_date,units,total_net_sales,net_sales):\n";
  for (const [date, d] of days) {
    out += `${date},${d.units},${money(d.gross)},${money(d.net)}\n`;
  }

  out += "\nTOTALS BY CATEGORY, most units first (category,units,total_net_sales):\n";
  for (const [name, c] of cats) {
    out += `${name},${c.units},${money(c.gross)}\n`;
  }

  out += "\nTOTALS BY ITEM, most units first (item_name,units,total_net_sales):\n";
  for (const [name, i] of items) {
    out += `${name},${i.units},${money(i.gross)}\n`;
  }

  return out;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'question' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    if (isSalesQuestion(question)) {
      // ── SALES PATH (Agentic) ────────────────────────────────────────────────
      console.log("Routing to Agentic Sales path for question:", question);

      const systemPrompt = `You are a sharp, data-driven restaurant sales analyst assistant.
Today is ${new Date().toISOString().split("T")[0]}.
Use the 'query_sales_data' tool to fetch raw daily sales data to answer the user's question.
IMPORTANT: To calculate "increases", "decreases", or trend comparisons, you MUST query a wide enough date range to cover BOTH the current period and the previous period (e.g. to compare this month vs last month, fetch data from 60 days ago until today).
The data has two money columns: total_net_sales is the gross amount for that item, and net_sales is the amount after discounts. Use total_net_sales when the user asks about sales or revenue unless they specifically ask about net or post-discount figures.
The tool returns a PRECOMPUTED EXACT TOTALS block giving totals by day, by category and by item, sometimes followed by raw rows. Every total, subtotal and per-item figure you report MUST be copied from that block — never add rows up yourself, as your arithmetic over many rows is unreliable. Derive percentages and comparisons from the precomputed totals. If the raw rows are omitted the totals still cover the full range and are exact.
The totals cover only dates that have data. If a date the user asked about is missing from TOTALS BY DAY, say the report was not uploaded for that day rather than reporting zero sales.
Answer concisely but completely. Give specific numbers.
Do NOT use markdown bold/italics. Use plain text with dashes (-) and line breaks for lists to ensure it renders cleanly in the UI.`;

      const requestBody: any = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        tools: [{
          functionDeclarations: [{
            name: "query_sales_data",
            description: "Query the sales database for raw daily item sales over a specific date range.",
            parameters: {
              type: "OBJECT",
              properties: {
                startDate: { type: "STRING", description: "Start date in YYYY-MM-DD" },
                endDate: { type: "STRING", description: "End date in YYYY-MM-DD" },
              },
              required: ["startDate", "endDate"],
            }
          }]
        }],
        // 2048 truncated real answers mid-sentence: this is a thinking model and
        // the budget covers reasoning across every tool round, not just the prose.
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      };

      // The model often needs more than one query: days can be missing from the
      // data entirely (2026-08-14 has no rows at all), so a question like "last
      // Friday" comes back empty and it reasonably asks again with a wider range.
      // Keep serving tool calls until it produces prose, with a ceiling so a
      // model that never stops asking cannot hang the request.
      const MAX_TOOL_ROUNDS = 4;
      let finalAnswer = "";

      for (let round = 1; round <= MAX_TOOL_ROUNDS; round++) {
        console.log(`Sending tool-capable payload to Gemini (round ${round})...`);
        const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        const data = await geminiRes.json();
        const parts = data.candidates?.[0]?.content?.parts || [];

        // A thinking model interleaves reasoning parts with the real payload, so
        // search the parts for a tool call or text rather than assuming index 0.
        const callPart = parts.find(
          (p: { functionCall?: { name: string } }) => p.functionCall?.name === "query_sales_data"
        );

        if (!callPart) {
          const textPart = parts.find((p: { text?: string }) => p.text);
          if (!textPart) {
            console.error("No tool call and no text in response:", JSON.stringify(data).slice(0, 1000));
          }
          finalAnswer = textPart?.text || "Sorry, I couldn't complete the calculation.";
          break;
        }

        const { startDate, endDate } = callPart.functionCall.args;
        console.log(`Round ${round}: Gemini requested sales data from ${startDate} to ${endDate}`);

        const { rows: rawSales, error } = await fetchAllSales(supabase, startDate, endDate);

        // A rejected query returns null data without throwing. Left unchecked it
        // reads as "nothing was sold that week" and the assistant reports that
        // as fact, so fail out loud instead of inventing an empty result set.
        if (error) {
          console.error("Sales query failed:", error);
          return new Response(
            JSON.stringify({
              answer: "I couldn't read the sales data just now, so I don't want to guess at numbers. Please try again — if it keeps happening, the sales query needs a look.",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const rows = rawSales;

        // Flatten to CSV rather than JSON to keep the token cost down. No item
        // name or category in this data contains a comma, so plain joins are safe.
        let csv = "";
        if (rows.length === 0) {
          // Say plainly that the days are absent, otherwise the model reads an
          // empty result as "we sold nothing" and reports zero sales as fact.
          csv = `No rows exist for ${startDate} to ${endDate}. No sales were recorded for those dates — this means the report was never uploaded, NOT that nothing sold.\n`;
        } else {
          csv = summariseSales(rows);

          // A wide range runs to thousands of rows, and dumping them all costs
          // more context than it earns now that every total above is exact. The
          // day, category and item breakdowns already answer most questions.
          if (rows.length <= RAW_ROW_LIMIT) {
            csv += "\n=== RAW DAILY ROWS (per-day, per-item detail) ===\n";
            csv += "report_date,category,item_name,units_sold,unit_price,total_net_sales,net_sales\n";
            for (const r of rows) {
              csv += `${r.report_date},${r.category},${r.item_name},${r.units_sold},${r.unit_price},${r.total_net_sales},${r.net_sales}\n`;
            }
          } else {
            csv += `\n(Raw rows omitted: ${rows.length} rows is too many to list. The totals above cover the full range and are exact. Narrow the date range if you need individual line items.)\n`;
          }
        }
        console.log(`Round ${round}: fetched ${rows.length} rows. Returning context to Gemini.`);

        // Echo the model's own turn back (it carries the thought signature that
        // links its reasoning across rounds), then answer the call.
        requestBody.contents.push(data.candidates[0].content);
        requestBody.contents.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: "query_sales_data",
              response: { name: "query_sales_data", content: csv }
            }
          }]
        });

        if (round === MAX_TOOL_ROUNDS) {
          console.error(`Hit MAX_TOOL_ROUNDS (${MAX_TOOL_ROUNDS}) without a final answer.`);
          finalAnswer = "I looked at several date ranges but couldn't pull that together. Try narrowing the question to a specific week or item.";
        }
      }

      return new Response(JSON.stringify({ answer: finalAnswer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // ── RECIPE / WORKBOOK PATH ─────────────────────────────────────────────
      console.log("Routing to recipe RAG path for question:", question);

      const embeddingRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: question }] },
            outputDimensionality: 768,
          }),
        }
      );

      const embeddingData = await embeddingRes.json();
      const queryVector = embeddingData.embedding?.values;

      let context = "";
      if (queryVector) {
        const { data: chunks, error } = await supabase.rpc("match_chunks", {
          query_embedding: queryVector,
          match_count: 15,
        });
        if (error) console.error("match_chunks error:", error);
        context = (chunks || []).map((c: { content: string }) => c.content).join("\n\n---\n\n");
      } else {
        console.warn("Embedding failed, falling back to keyword fetch");
        const { data: chunks } = await supabase.from("workbook_chunks").select("content").limit(50);
        context = (chunks || []).map((c: { content: string }) => c.content).join("\n\n---\n\n");
      }

      const systemPrompt = `You are a helpful kitchen assistant for a restaurant crew. You have access to the restaurant's recipe workbooks and operational data. Answer questions accurately based on the workbook data provided below. If the answer isn't in the data, say so honestly. Be concise and practical — these are busy kitchen workers. IMPORTANT FORMATTING RULE: Do NOT use markdown formatting like **bold** or *italics*. However, you MUST use line breaks and simple dashes (-) to create clean, readable lists for ingredients and steps.\n\nWORKBOOK DATA:\n${context || "(No workbooks uploaded yet)"}`;

      // ── Gemini generation for Recipe Path ─────────────────────────────────────
      const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: systemPrompt + "\n\nQuestion: " + question }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      });

      const geminiData = await geminiRes.json();
      const answer =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't generate a response. Please try again.";

      return new Response(JSON.stringify({ answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
