import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from './ui/button'

export function RoomQR({ code }) {
  const joinUrl = `${window.location.origin}/join/${code}`
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="bg-white p-8 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <QRCodeSVG value={joinUrl} size={192} bgColor="white" fgColor="black" />
          <p className="mt-4 text-black font-mono text-2xl font-bold">{code}</p>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Scan this QR code to join the room
      </p>
      <Button
        onClick={copy}
        variant="outline"
        className="w-full rounded-2xl border-white/10 hover:border-primary hover:text-primary"
      >
        {copied ? 'Copied!' : 'Copy join link'}
      </Button>
    </div>
  )
}
