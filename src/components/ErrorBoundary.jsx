import React from 'react'

export class ErrorBoundary extends React.Component {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }

  render() {
    if (this.state.crashed) {
      return (
        <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center text-white p-8">
          <p className="text-5xl mb-4">💥</p>
          <h1 className="font-black text-2xl mb-2">Something exploded.</h1>
          <p className="text-white/60 mb-6">The vibe got too strong. Try refreshing.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-400 text-black font-bold px-6 py-2 rounded-xl"
          >
            Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
