import React from 'react'

export class ErrorBoundary extends React.Component {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }

  render() {
    if (this.state.crashed) {
      return (
        <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center text-foreground p-8">
          <p className="text-5xl mb-4">💥</p>
          <h1 className="font-black text-2xl mb-2">Something exploded.</h1>
          <p className="text-muted-foreground mb-6">The vibe got too strong. Try refreshing.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition"
          >
            Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
