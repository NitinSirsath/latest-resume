import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// This function is deprecated. 
// Use 'write-docx' for DOCX generation and 'convert-pdf' for PDF generation.
serve(() => {
  return new Response(
    JSON.stringify({ 
      error: "This endpoint is deprecated. Use write-docx instead.", 
      code: "DEPRECATED" 
    }),
    { 
      status: 410, // Gone
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  )
})
