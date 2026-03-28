import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export function RoomQR({ code }) {
  const joinUrl = `${window.location.origin}/join/${code}`
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5">
      <QRCodeSVG value={joinUrl} size={128} bgColor="transparent" fgColor="#FACC15" />
      <p className="text-yellow-400 font-black tracking-widest text-xl">{code}</p>
      <button onClick={copy} className="text-sm text-white/60 hover:text-white transition">
        {copied ? '✓ Copied!' : 'Copy join link'}
      </button>
    </div>
  )
}
