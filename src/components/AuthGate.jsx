import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthGate({ children, session }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) return children

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <h2 style={{ marginBottom: '1rem' }}>
          {isSignUp ? 'Create account' : 'Sign in to Inferno'}
        </h2>
        <form onSubmit={handleSubmit} className="form-panel">
          <label className="hero-metadata">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
          </label>
          <label className="hero-metadata">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {error && <p style={{ color: '#ff8ba0', margin: 0 }}>{error}</p>}
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  )
}