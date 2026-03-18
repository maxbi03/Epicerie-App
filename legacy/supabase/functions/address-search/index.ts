import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";

  if (query.length < 3) {
    return new Response(
      JSON.stringify({ suggestions: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {

    const response = await fetch(
      `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(query)}&type=locations&limit=8`
    );

    const data = await response.json();

    const suggestions = (data.results || []).map((item: any) => {

      const label = item.attrs.label
        .replace(/<[^>]*>/g, "")
        .trim();

      const parts = label.split(",");

      return {
        label,
        street: parts[0] || "",
        houseNumber: "",
        postalCode: "",
        city: parts[1] || "",
        country: "CH",
      };
    });

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {

    return new Response(
      JSON.stringify({ suggestions: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  }

});