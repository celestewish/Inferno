import { useCallback, useEffect, useState } from 'react'
import '../App.css'
import { supabase, formatSupabaseError } from '../lib/supabase'
import GuestTaskBoard from './GuestTaskBoard'
import GuestSignupBanner from './GuestSignupBanner'
import InfernoLogo from './InfernoLogo'

// These links shouldn't end up in search results.
function useNoIndex() {
  useEffect(() => {
    const tag = document.createElement('meta')
    tag.name = 'robots'
    tag.content = 'noindex'
    document.head.appendChild(tag)
    return () => document.head.removeChild(tag)
  }, [])
}

const INVALID_TOKEN_MESSAGE = 'This link is invalid, revoked, or has expired'

export default function GuestBoardView({ token }) {
  const [status, setStatus] = useState('loading') // loading | valid | invalid | error
  const [board, setBoard] = useState(null)
  const [tasks, setTasks] = useState([])

  useNoIndex()

  const load = useCallback(async () => {
    setStatus('loading')

    const { data, error } = await supabase.rpc('get_board_guest_view', { p_token: token })

    if (error) {
      console.error('Guest board view error:', formatSupabaseError(error), error)
      setStatus(error.message?.includes(INVALID_TOKEN_MESSAGE) ? 'invalid' : 'error')
      return
    }

    setBoard(data.board)
    setTasks(data.tasks ?? [])
    setStatus('valid')
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return (
      <div className="app-loading" role="status" data-testid="guest-loading">
        <span className="app-loading-spinner" aria-hidden="true" />
        <p>Loading board…</p>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="load-error-shell" data-testid="guest-invalid">
        <section className="panel load-error-card">
          <div className="load-error-mark" aria-hidden="true">⚠</div>
          <p className="eyebrow">Link no longer active</p>
          <h2>This link is no longer active</h2>
          <p className="muted-copy">Ask the board owner for a new one.</p>
        </section>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="load-error-shell" data-testid="guest-error">
        <section className="panel load-error-card">
          <div className="load-error-mark" aria-hidden="true">⚠</div>
          <p className="eyebrow">Something went wrong</p>
          <h2>We hit a snag loading this board</h2>
          <p className="muted-copy">Check your connection and try again.</p>
          <div className="marketing-cta-row">
            <button type="button" className="primary-btn" onClick={load}>Try again</button>
          </div>
        </section>
      </div>
    )
  }

  const columns = board.kanban_sections ?? []

  return (
    <div className="guest-shell">
      <header className="guest-topbar">
        <div className="guest-topbar-brand">
          <InfernoLogo size={26} />
          <span className="guest-topbar-mark">Inferno</span>
        </div>
        <span className="guest-badge">View only</span>
      </header>

      <div className="guest-board-header">
        <p className="eyebrow">Shared board</p>
        <h1>{board.name}</h1>
        {board.description ? <p className="muted-copy">{board.description}</p> : null}
      </div>

      <main className="guest-board-main">
        <GuestTaskBoard columns={columns} tasks={tasks} />
      </main>

      <GuestSignupBanner boardName={board.name} />
    </div>
  )
}
