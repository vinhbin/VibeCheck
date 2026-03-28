import { useParams } from 'react-router-dom'
import { safeGet } from '../lib/storage'

function triggerDownload(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function exportVCard(card) {
  const vcf_escape = (s = '') =>
    String(s).replace(/[\r\n]+/g, ' ').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;')

  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${vcf_escape(card.name)}`,
    `NOTE:Building: ${vcf_escape(card.project)}\\nNeeds: ${vcf_escape(card.need)}\\nOffers: ${vcf_escape(card.offer)}`,
    'END:VCARD',
  ].join('\r\n')

  const safeName = String(card.name).replace(/[^\w\s-]/g, '').trim() || 'contact'
  triggerDownload(`${safeName}.vcf`, vcf, 'text/vcard')
}

function exportCSV(matches) {
  const myCardId = safeGet('my_card_id')
  const sanitize = (val = '') => {
    const s = String(val).replace(/"/g, '""')
    return /^[=+\-@]/.test(s) ? `'${s}` : s
  }
  const header = 'Name,Project,Need,Offer,Icebreaker,Status'
  const rows = matches.map((match) => {
    const theirSnapshot = myCardId && match.card_a === myCardId
      ? match.card_b_snapshot
      : match.card_a_snapshot
    const c = theirSnapshot ?? match.card_b_snapshot
    return `"${sanitize(c?.name)}","${sanitize(c?.project)}","${sanitize(c?.need)}","${sanitize(c?.offer)}","${sanitize(match.icebreaker)}","${sanitize(match.status)}"`
  })
  triggerDownload('vibecheck-matches.csv', [header, ...rows].join('\n'), 'text/csv')
}

export default function Matches() {
  const { eventId } = useParams()

  // TODO: fetch matches for eventId, display list, per-contact vCard + bulk CSV export
  return null
}
