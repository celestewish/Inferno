import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { siteUrl } from '../lib/site'

export default function AuthGate({ children, session }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  if (session) return children

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${siteUrl}/` } })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) setError(error.message)
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    setError('')
    setNotice('')
    if (!email.trim()) {
      setError('Enter your email above, then select “Forgot password?” to get a reset link.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${siteUrl}/`,
    })
    if (error) setError(error.message)
    else setNotice(`Password reset email sent to ${email.trim()}. Check your inbox.`)
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
          {notice && <p style={{ color: '#8ce0b0', margin: 0 }} data-testid="auth-notice">{notice}</p>}
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
          {!isSignUp && (
            <button
              type="button"
              className="link-btn"
              data-testid="auth-forgot-password"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Forgot password?
            </button>
          )}
          <button
            type="button"
            className="secondary-btn"
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setNotice('') }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  )
}