import { supabase } from '../lib/supabase'

export async function embedCard(card, { isRetry = false } = {}) {
  try {
    // Stagger to avoid rate-limit spikes when many cards are created at once
    await new Promise(r => setTimeout(r, Math.random() * 2000))

    const [needVec, offerVec] = await Promise.all([
      fetchEmbedding(card.need),
      fetchEmbedding(card.offer),
    ])

    await supabase
      .from('vibe_cards')
      .update({ need_embedding: needVec, offer_embedding: offerVec })
      .eq('id', card.id)

    if (isRetry) {
      await supabase.from('failed_embeds').delete().eq('card_id', card.id)
    }
  } catch {
    if (!isRetry) {
      await supabase.from('failed_embeds').insert({ card_id: card.id })
      setTimeout(() => embedCard(card, { isRetry: true }), 5000)
    }
  }
}

async function fetchEmbedding(text) {
  const res = await fetch(`${import.meta.env.VITE_PROXY_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error('Embed failed')
  const { embedding } = await res.json()
  return embedding
}
