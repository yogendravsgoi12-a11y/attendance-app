import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('Please wait...')

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          })

    if (error) {
      setStatus(error.message)
    } else if (mode === 'signup') {
      setStatus('Account created. New accounts start as "teacher" — ask an admin to upgrade you if needed. You can sign in now.')
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-logo-lg">VSGOI</div>
          <div className="auth-college">Dr. Virendra Swarup Group of Education</div>
          <div className="auth-tagline">Attendance System</div>
        </div>
        <h2>{mode === 'signin' ? 'Sign in to your account' : 'Create your account'}</h2>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              Full Name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <button type="submit">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</button>
        </form>

        <p>
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button className="link" onClick={() => setMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="link" onClick={() => setMode('signin')}>
                Sign in
              </button>
            </>
          )}
        </p>

        {status && <p className="status">{status}</p>}
      </div>
    </div>
  )
}
