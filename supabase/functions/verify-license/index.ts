import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { license_number } = await req.json()

    if (!license_number || !/^\d{9}$/.test(license_number)) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid license number format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Call CA Community Care Licensing Open Data API
    const apiUrl = `https://data.chhs.ca.gov/api/3/action/datastore_search?resource_id=4b5cc48d-03b1-4f42-a7d1-b9816903eb2b&filters={"facility_number":"${license_number}"}`

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (data.success && data.result.records.length > 0) {
      const facility = data.result.records[0]

      if (facility.facility_status === 'LICENSED') {
        return new Response(
          JSON.stringify({
            valid: true,
            status: 'LICENSED',
            facility_type: facility.facility_type,
            facility_city: facility.facility_city
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({
            valid: false,
            status: facility.facility_status,
            error: 'License not currently active'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      return new Response(
        JSON.stringify({ valid: false, error: 'License not found in state database' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Verification service unavailable' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
