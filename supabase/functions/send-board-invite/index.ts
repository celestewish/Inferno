const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DEFAULT_FROM = 'Inferno <celeste@infernotaskboard.com>'

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const inviteHtml = (role: string, acceptUrl: string) => `
  <div style="margin:0;padding:0;background:#09111f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#09111f;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111a2b;border:1px solid #24324d;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 20px 32px;background:linear-gradient(180deg,#15233b 0%,#111a2b 100%);">
                <div style="font-family:'Courier New',monospace;font-size:28px;line-height:1;color:#7fb2ff;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                  Inferno
                </div>
                <div style="margin-top:12px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#8ea3c7;">
                  Game production, organized
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 32px 32px 32px;font-family:Arial,sans-serif;color:#e8eefc;">
                <h2 style="margin:0 0 16px 0;font-size:28px;line-height:1.2;color:#f7faff;">
                  You’ve been invited to join an Inferno board
                </h2>

                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;color:#b8c6e3;">
                  You were invited as a <strong style="color:#ffffff;">${role}</strong>.
                </p>

                <p style="margin:0 0 24px 0;font-size:16px;line-height:1.7;color:#b8c6e3;">
                  Open the invite below to join the board and start collaborating with your team.
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                  <tr>
                    <td>
                      <a
                        href="${acceptUrl}"
                        style="display:inline-block;padding:14px 20px;background:#4b7dff;color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;font-family:Arial,sans-serif;"
                      >
                        Accept invite
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 10px 0;font-size:14px;line-height:1.7;color:#8ea3c7;">
                  If the button does not work, use this link:
                </p>

                <p style="margin:0;font-size:14px;line-height:1.7;word-break:break-word;">
                  <a href="${acceptUrl}" style="color:#7fb2ff;text-decoration:underline;">${acceptUrl}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not configured')
    return json({ error: 'Email service is not configured' }, 500)
  }

  let payload: { email?: string; role?: string; acceptUrl?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { email, role, acceptUrl } = payload
  if (!email || !acceptUrl) {
    return json({ error: 'Missing required fields: email and acceptUrl' }, 400)
  }

  const from = Deno.env.get('INVITE_FROM_EMAIL') || DEFAULT_FROM
  const roleLabel = role || 'collaborator'

  let resendResponse: Response
  try {
    resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: 'You’ve been invited to join an Inferno board',
        html: inviteHtml(roleLabel, acceptUrl),
      }),
    })
  } catch (err) {
    console.error('Failed to reach Resend:', err)
    return json({ error: 'Failed to reach email service' }, 502)
  }

  if (!resendResponse.ok) {
    let detail: unknown
    try {
      detail = await resendResponse.json()
    } catch {
      detail = await resendResponse.text().catch(() => '')
    }
    console.error('Resend returned an error:', resendResponse.status, detail)
    const message =
      (detail && typeof detail === 'object' && 'message' in detail
        ? (detail as { message?: string }).message
        : undefined) || 'Email service rejected the request'
    return json({ error: message, status: resendResponse.status }, 502)
  }

  const data = await resendResponse.json().catch(() => ({}))
  return json({ success: true, data }, 200)
})
