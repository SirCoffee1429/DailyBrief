/// <reference path="../deno-types.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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

    // Create Supabase client using the request's auth
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Fetch workbook chunks for context
    const { data: chunks } = await supabase
      .from("workbook_chunks")
      .select("content")
      .limit(100);

    const context = (chunks || []).map((c: { content: string }) => c.content).join("\n\n---\n\n");

    const systemPrompt = `You are a helpful kitchen assistant for a restaurant crew. You have access to the restaurant's recipe workbooks and operational data. Answer questions accurately based on the workbook data provided below. If the answer isn't in the data, say so honestly. Be concise and practical — these are busy kitchen workers.

WORKBOOK DATA:
${context || "(No workbooks uploaded yet)"}`;

    // Call Gemini
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
          maxOutputTokens: 1024,
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
