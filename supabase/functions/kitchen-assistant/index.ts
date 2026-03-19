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

    // Step 1: Embed the question
    const embeddingRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: question }] }
        })
      }
    );

    const embeddingData = await embeddingRes.json();
    const queryVector = embeddingData.embedding?.values;

    let context = "";

    if (queryVector) {
      // Step 2: Find the most relevant chunks via vector similarity
      const { data: chunks, error } = await supabase.rpc("match_chunks", {
        query_embedding: queryVector,
        match_count: 15
      });

      if (error) console.error("match_chunks error:", error);

      context = (chunks || []).map((c: { content: string }) => c.content).join("\n\n---\n\n");
    } else {
      // Fallback: if embedding fails, grab a limited set of chunks the old way
      console.warn("Embedding failed, falling back to keyword fetch");
      const { data: chunks } = await supabase
        .from("workbook_chunks")
        .select("content")
        .limit(50);
      context = (chunks || []).map((c: { content: string }) => c.content).join("\n\n---\n\n");
    }

    const systemPrompt = `You are a helpful kitchen assistant for a restaurant crew. You have access to the restaurant's recipe workbooks and operational data. Answer questions accurately based on the workbook data provided below. If the answer isn't in the data, say so honestly. Be concise and practical — these are busy kitchen workers. IMPORTANT FORMATTING RULE: Do NOT use markdown formatting like **bold** or *italics*. However, you MUST use line breaks and simple dashes (-) to create clean, readable lists for ingredients and steps.

WORKBOOK DATA:
${context || "(No workbooks uploaded yet)"}`;

    // Step 3: Send to Gemini
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
          temperature: 0.3,
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