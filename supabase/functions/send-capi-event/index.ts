const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DEFAULT_PIXEL_ID = '1619176119634089'
const GRAPH_API_VERSION = 'v19.0'

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface EventPayload {
  event_name?: string
  event_id?: string
  event_source_url?: string
  event_time?: number
  action_source?: string
  client_user_agent?: string
  email?: string
  fbp?: string
  fbc?: string
  test_event_code?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const accessToken = Deno.env.get('META_CAPI_ACCESS_TOKEN')
  if (!accessToken) {
    console.error('META_CAPI_ACCESS_TOKEN is not configured')
    return json({ error: 'Conversions API is not configured' }, 500)
  }
  const pixelId = Deno.env.get('META_PIXEL_ID') || DEFAULT_PIXEL_ID

  let payload: EventPayload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const {
    event_name,
    event_id,
    event_source_url,
    event_time,
    action_source,
    client_user_agent,
    email,
    fbp,
    fbc,
    test_event_code,
  } = payload
  if (!event_name || !event_id || !event_source_url || !event_time || !action_source || !client_user_agent) {
    return json(
      {
        error:
          'Missing required fields: event_name, event_id, event_source_url, event_time, action_source, client_user_agent',
      },
      400,
    )
  }

  // Meta rejects events whose only customer-information parameter is
  // client_user_agent ("insufficient customer information"). client_ip_address
  // (from the request itself) and the _fbp cookie are free, non-PII matching
  // signals that satisfy this without collecting anything new from the user.
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip')

  const userData: Record<string, string> = { client_user_agent }
  if (clientIp) userData.client_ip_address = clientIp
  if (fbp) userData.fbp = fbp
  if (fbc) userData.fbc = fbc
  if (email) {
    userData.em = await sha256Hex(email.trim().toLowerCase())
  }

  let metaResponse: Response
  try {
    metaResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            {
              event_name,
              event_id,
              event_time,
              event_source_url,
              action_source,
              user_data: userData,
            },
          ],
          ...(test_event_code ? { test_event_code } : {}),
        }),
      },
    )
  } catch (err) {
    console.error('Failed to reach Meta Graph API:', err)
    return json({ error: 'Failed to reach Meta Conversions API' }, 502)
  }

  const data = await metaResponse.json().catch(() => ({}))
  if (!metaResponse.ok) {
    console.error('Meta Conversions API returned an error:', metaResponse.status, data)
    return json({ error: 'Meta Conversions API rejected the request', detail: data }, 502)
  }

  return json({ success: true, data }, 200)
})
