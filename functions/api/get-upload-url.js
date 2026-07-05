// Cloudflare Pages Function — generează un URL presigned (PUT) direct către R2,
// ca browserul să poată urca fișierul video fără să treacă prin limita de
// timp/mărime a unei Function. Necesită variabilele R2_ACCESS_KEY_ID,
// R2_SECRET_ACCESS_KEY, R2_S3_ENDPOINT, R2_BUCKET_NAME, R2_PUBLIC_BASE.
import { AwsClient } from 'aws4fetch'

export async function onRequestPost(context) {
  const { request, env } = context
  try {
    const { trainer_id, slot, content_type } = await request.json()

    const safeTrainerId = String(trainer_id || 'anon').replace(/[^a-zA-Z0-9_-]/g, '')
    const safeSlot = String(slot ?? '0').replace(/[^a-zA-Z0-9_-]/g, '')
    const key = `clips/${safeTrainerId}/${crypto.randomUUID()}-${safeSlot}.mp4`

    const client = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto',
    })

    const objectUrl = `${env.R2_S3_ENDPOINT}/${env.R2_BUCKET_NAME}/${key}`

    const signedRequest = await client.sign(objectUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': content_type || 'video/mp4',
      },
      aws: { signQuery: true },
    })

    const uploadUrl = signedRequest.url
    const publicUrl = `${env.R2_PUBLIC_BASE}/${key}`

    return new Response(
      JSON.stringify({ uploadUrl, publicUrl }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Nu am putut genera URL-ul de upload.', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}