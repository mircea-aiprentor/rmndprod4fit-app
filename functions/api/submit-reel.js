// Cloudflare Pages Function — primește datele reel-ului din formular și le
// trimite către webhook-ul n8n, ținând cheia X-API-Key ascunsă (nu în browser).
// Necesită variabilele N8N_WEBHOOK_URL și N8N_API_KEY (tip "secret"),
// configurate în Cloudflare Pages → Settings → Environment variables.

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const body = await request.json()

    const n8nResponse = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.N8N_API_KEY,
      },
      body: JSON.stringify(body),
    })

    const text = await n8nResponse.text()

    return new Response(text, {
      status: n8nResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Trimitere eșuată.', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
