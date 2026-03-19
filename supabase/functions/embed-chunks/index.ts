import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { workbook_id } = await req.json();
    if (!workbook_id) {
      return new Response(JSON.stringify({ error: "Missing workbook_id" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all chunks for this workbook that don't have embeddings yet
    const { data: chunks, error } = await supabase
      .from("workbook_chunks")
      .select("id, content")
      .eq("workbook_id", workbook_id)
      .is("embedding", null);

    if (error) throw error;
    if (!chunks || chunks.length === 0) {
      return new Response(JSON.stringify({ message: "No chunks to embed" }), { headers: corsHeaders });
    }

    console.log(`Embedding ${chunks.length} chunks for workbook ${workbook_id}`);

    // Embed each chunk
    for (const chunk of chunks) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: chunk.content }] }
          })
        }
      );

      if (!res.ok) {
        console.error(`Failed to embed chunk ${chunk.id}:`, await res.text());
        continue;
      }

      const data = await res.json();
      const vector = data.embedding?.values;

      if (vector) {
        await supabase
          .from("workbook_chunks")
          .update({ embedding: vector })
          .eq("id", chunk.id);
      }
    }

    return new Response(JSON.stringify({ success: true, embedded: chunks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("embed-chunks error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});