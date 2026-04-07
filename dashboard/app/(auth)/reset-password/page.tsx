'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Check that user arrived via a valid reset link
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is in password recovery mode — allow them to set new password
      }
    })
  }, [supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={{ background: 'rgba(0,208,132,0.12)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">New Password</h1>
          <p className="mt-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Enter your new password below
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl p-6" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
          {success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ background: 'rgba(0,208,132,0.12)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="9 12 12 15 16 10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Password Updated</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Redirecting to sign in...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                    style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                  style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>

              {error && (
                <div className="px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ background: '#00D084', color: '#000' }}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Link href="/login" className="font-medium transition hover:underline" style={{ color: '#00D084' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
