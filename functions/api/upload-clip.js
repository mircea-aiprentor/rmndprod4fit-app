// Cloudflare Pages Function — primește un clip video și îl urcă în R2.
// Necesită: legătură R2 numită REELS_BUCKET + variabila R2_PUBLIC_BASE,
// configurate în Cloudflare Pages → Settings → Functions.

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const trainerId = formData.get('trainer_id') || 'anon'
    const slot = formData.get('slot') ?? '0'

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'Lipsește fișierul video.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const safeTrainerId = String(trainerId).replace(/[^a-zA-Z0-9_-]/g, '')
    const key = `clips/${safeTrainerId}/${crypto.randomUUID()}-${slot}.mp4`

    await env.REELS_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || 'video/mp4' },
    })

    const publicUrl = `${env.R2_PUBLIC_BASE}/${key}`

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Upload eșuat.', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
