import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Sales intent detection ───────────────────────────────────────────────────
const SALES_KEYWORDS = [
  "sold", "sell", "sales", "revenue", "popular", "top seller", "best seller",
  "worst seller", "how many", "percentage", "percent", "most sold", "least sold",
  "top item", "best item", "category", "this week", "last week", "yesterday",
  "this month", "last month", "total", "how much did", "how much have",
  "did we sell", "have we sold", "what sold", "ranking", "breakdown",
];

function isSalesQuestion(q: string): boolean {
  const lower = q.toLowerCase();
  return SALES_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Sales context builder ────────────────────────────────────────────────────
async function fetchSalesContext(
  supabase: any,
  _question: string
): Promise<string> {
  const today = new Date();
  const to = today.toISOString().split("T")[0];
  const fromDate = new Date();
  fromDate.setDate(today.getDate() - 30);
  const from = fromDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("sales_data")
    .select("item_name, units_sold, unit_price, total_revenue, category, report_date")
    .gte("report_date", from)
    .lte("report_date", to)
    .order("report_date", { ascending: false });

  if (error) {
    console.error("Sales fetch error:", error);
    return "(Could not retrieve sales data)";
  }

  if (!data || data.length === 0) {
    return `No sales data found for the last 30 days.`;
  }

  // Aggregate by item across all dates in the window
  const itemMap: Record<string, { units: number; revenue: number; price: number; category: string }> = {};
  let grandUnits = 0;
  let grandRevenue = 0;

  for (const row of data as any[]) {
    const key = row.item_name;
    if (!itemMap[key]) {
      itemMap[key] = { units: 0, revenue: 0, price: row.unit_price || 0, category: row.category || "" };
    }
    itemMap[key].units += Number(row.units_sold) || 0;
    itemMap[key].revenue += Number(row.total_revenue) || 0;
    grandUnits += Number(row.units_sold) || 0;
    grandRevenue += Number(row.total_revenue) || 0;
  }

  const sorted = Object.entries(itemMap).sort(([, a], [, b]) => b.units - a.units);

  let ctx = `[30-DAY AGGREGATE SUMMARY: ${from} to ${to}]\n`;
  ctx += `Grand totals: ${grandUnits} units sold, $${grandRevenue.toFixed(2)} revenue\n\n`;

  ctx += `AGGREGATE ITEM BREAKDOWN:\n`;
  ctx += `Item Name | Category | Units Sold | Total Revenue | % of Units\n`;
  for (const [name, v] of sorted) {
    const pctUnits = grandUnits > 0 ? ((v.units / grandUnits) * 100).toFixed(1) : "0.0";
    const rev = v.revenue > 0 ? `$${v.revenue.toFixed(2)}` : "N/A";
    ctx += `${name} | ${v.category} | ${v.units} | ${rev} | ${pctUnits}%\n`;
  }

  ctx += `\n[DAILY RAW DATA BREAKDOWN]\n`;
  ctx += `Date | Item Name | Category | Units Sold | Unit Price | Total Revenue\n`;
  for (const row of data as any[]) {
    const p = row.unit_price ? `$${Number(row.unit_price).toFixed(2)}` : "0";
    const r = row.total_revenue ? `$${Number(row.total_revenue).toFixed(2)}` : "0";
    ctx += `${row.report_date} | ${row.item_name} | ${row.category} | ${row.units_sold} | ${p} | ${r}\n`;
  }

  return ctx;
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

    let systemPrompt: string;

    if (isSalesQuestion(question)) {
      // ── SALES PATH ──────────────────────────────────────────────────────────
      console.log("Routing to sales path for question:", question);
      const salesContext = await fetchSalesContext(supabase, question);

      systemPrompt = `You are a sharp, data-driven restaurant sales analyst assistant.
You have access to the restaurant's item-level sales data below. Answer questions accurately using ONLY this data.
Be concise but complete. Give specific numbers. When asked for percentages, compute them from the data provided.
If a specific item isn't found in the data for the requested period, say so clearly.
Do NOT use markdown bold/italics. Use plain text with dashes (-) and line breaks for lists.

${salesContext}`;

    } else {
      // ── RECIPE / WORKBOOK PATH (unchanged) ─────────────────────────────────
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

      systemPrompt = `You are a helpful kitchen assistant for a restaurant crew. You have access to the restaurant's recipe workbooks and operational data. Answer questions accurately based on the workbook data provided below. If the answer isn't in the data, say so honestly. Be concise and practical — these are busy kitchen workers. IMPORTANT FORMATTING RULE: Do NOT use markdown formatting like **bold** or *italics*. However, you MUST use line breaks and simple dashes (-) to create clean, readable lists for ingredients and steps.\n\nWORKBOOK DATA:\n${context || "(No workbooks uploaded yet)"}`;
    }

    // ── Gemini generation ──────────────────────────────────────────────────────
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